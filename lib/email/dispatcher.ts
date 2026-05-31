/**
 * Processador da fila `email_outbox`.
 *
 * Lê itens com status='pendente', renderiza o template, envia via Resend
 * e atualiza o registro com 'enviado' ou 'falhou' (incrementando
 * tentativas). Pode ser chamado:
 *   - imediatamente pela rota que enfileira (envio sub-segundo no caminho
 *     feliz),
 *   - periodicamente por /api/email/dispatch (cron — retry/safety net).
 *
 * Itens com `tentativas >= MAX_TENTATIVAS` são marcados 'falhou' e param
 * de ser reprocessados.
 */
import "server-only";
import { criarSupabaseAdmin } from "@/lib/supabase/server";
import { enviarEmail } from "./enviar";
import { renderizarTemplate } from "./templates";
import type { EmailEventoTipo } from "@/lib/mock/types";

const MAX_TENTATIVAS = 3;
const LIMITE_LOTE_PADRAO = 50;
/** Quanto tempo até considerar uma linha "enviando" abandonada e re-reclamá-la. */
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

export interface ResumoProcessamento {
  total: number;
  enviados: number;
  falhados: number;
  abandonados: number;
}

export async function processarFila(
  opcoes: { limite?: number } = {},
): Promise<ResumoProcessamento> {
  const limite = opcoes.limite ?? LIMITE_LOTE_PADRAO;
  const admin = criarSupabaseAdmin();

  // Sweep defensivo: re-elegível qualquer linha em "enviando" cujo claim
  // ficou velho (o processo anterior morreu antes de finalizar).
  const limiteClaim = new Date(Date.now() - CLAIM_TIMEOUT_MS).toISOString();
  await admin
    .from("email_outbox")
    .update({ status: "pendente", claimed_em: null })
    .eq("status", "enviando")
    .lt("claimed_em", limiteClaim);

  const { data: candidatos, error } = await admin
    .from("email_outbox")
    .select("id")
    .eq("status", "pendente")
    .lt("tentativas", MAX_TENTATIVAS)
    .order("criado_em", { ascending: true })
    .limit(limite);

  if (error) {
    throw new Error(`Falha ao buscar fila: ${error.message}`);
  }

  const candidatosIds = (candidatos ?? []).map((r) => r.id);
  const resumo: ResumoProcessamento = {
    total: 0,
    enviados: 0,
    falhados: 0,
    abandonados: 0,
  };
  if (candidatosIds.length === 0) return resumo;

  // CLAIM: marca como "enviando" só as linhas que ainda estão "pendente".
  // Como o UPDATE de uma linha é atômico, duas invocações concorrentes não
  // conseguem ambas reclamar o mesmo id — uma das duas vê 0 rows pra essa
  // linha. Só processamos as linhas que VOLTAM do RETURNING (`select()`).
  const { data: reclamados, error: errClaim } = await admin
    .from("email_outbox")
    .update({ status: "enviando", claimed_em: new Date().toISOString() })
    .in("id", candidatosIds)
    .eq("status", "pendente")
    .select("*");
  if (errClaim) {
    throw new Error(`Falha ao reclamar lote: ${errClaim.message}`);
  }
  const itens = reclamados ?? [];
  resumo.total = itens.length;
  if (itens.length === 0) return resumo;

  for (const item of itens) {
    let assunto = item.assunto;
    let html = item.corpo_html ?? "";
    let texto = item.corpo_texto ?? "";

    // Se o corpo ainda não foi renderizado, renderiza agora.
    if (!html || !texto) {
      try {
        const t = renderizarTemplate(
          item.tipo_evento as EmailEventoTipo,
          item.destinatario_nome,
          item.payload,
        );
        if (!assunto) assunto = t.assunto;
        html = t.html;
        texto = t.texto;
      } catch (e) {
        await marcarFalha(
          item.id,
          item.tentativas + 1,
          e instanceof Error ? e.message : "erro de renderização",
        );
        resumo.falhados += 1;
        if (item.tentativas + 1 >= MAX_TENTATIVAS) resumo.abandonados += 1;
        continue;
      }
    }

    const resultado = await enviarEmail({
      to: item.destinatario_email,
      subject: assunto,
      html,
      text: texto,
    });

    if (resultado.ok) {
      const { error: errUpd } = await admin
        .from("email_outbox")
        .update({
          status: "enviado",
          tentativas: item.tentativas + 1,
          enviado_em: new Date().toISOString(),
          claimed_em: null,
          corpo_html: html,
          corpo_texto: texto,
          assunto,
          erro_ultimo: null,
        })
        .eq("id", item.id);
      if (errUpd) {
        console.error(`Falha ao marcar enviado: ${errUpd.message}`);
      }
      resumo.enviados += 1;
    } else {
      const novasTentativas = item.tentativas + 1;
      await marcarFalha(item.id, novasTentativas, resultado.erro);
      resumo.falhados += 1;
      if (novasTentativas >= MAX_TENTATIVAS) resumo.abandonados += 1;
    }
  }

  return resumo;
}

async function marcarFalha(
  id: string,
  tentativas: number,
  erro: string,
): Promise<void> {
  const admin = criarSupabaseAdmin();
  const status = tentativas >= MAX_TENTATIVAS ? "falhou" : "pendente";
  const { error } = await admin
    .from("email_outbox")
    .update({ tentativas, status, erro_ultimo: erro, claimed_em: null })
    .eq("id", id);
  if (error) {
    console.error(`Falha ao atualizar item ${id}: ${error.message}`);
  }
}
