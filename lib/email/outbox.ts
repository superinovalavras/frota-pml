/**
 * Helpers para enfileirar emails na tabela `email_outbox`.
 *
 * SERVER-ONLY: usa o cliente admin (service_role) — só pode rodar dentro
 * de Route Handlers ou Server Actions. NUNCA importe deste arquivo a
 * partir de Client Components.
 */
import "server-only";
import { criarSupabaseAdmin } from "@/lib/supabase/server";
import type { EmailEventoTipo } from "@/lib/mock/types";

interface DadosDestinatario {
  email: string;
  nome: string;
  profileId?: string | null;
}

interface EnfileirarEntradaArgs {
  tipoEvento: EmailEventoTipo;
  destinatario: DadosDestinatario;
  assunto: string;
  payload: Record<string, unknown>;
  agendamentoId?: string | null;
  veiculoId?: string | null;
}

/**
 * Insere uma linha em `email_outbox`. Não envia o email — apenas registra
 * o evento na fila para o processador (Vercel cron) coletar e enviar.
 */
export async function enfileirarEmail(
  args: EnfileirarEntradaArgs,
): Promise<void> {
  const email = args.destinatario.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    // Sem email válido, não há como notificar — silencia para não bloquear
    // a operação principal (criar manutenção, cancelar reserva, etc.).
    return;
  }
  const supabase = criarSupabaseAdmin();
  const { error } = await supabase.from("email_outbox").insert({
    tipo_evento: args.tipoEvento,
    destinatario_email: email,
    destinatario_nome: args.destinatario.nome,
    destinatario_profile_id: args.destinatario.profileId ?? null,
    assunto: args.assunto,
    payload: args.payload,
    agendamento_id: args.agendamentoId ?? null,
    veiculo_id: args.veiculoId ?? null,
    status: "pendente",
    tentativas: 0,
  });
  if (error) {
    throw new Error(`enfileirarEmail: ${error.message}`);
  }
}

/**
 * Enfileira vários destinatários do mesmo evento de uma vez, deduplicando
 * por email (evita enviar duas vezes para a mesma pessoa quando ela
 * aparece em mais de um papel — ex.: solicitante e motorista).
 */
export async function enfileirarEmailLote(
  destinatarios: DadosDestinatario[],
  comum: Omit<EnfileirarEntradaArgs, "destinatario">,
): Promise<void> {
  const vistos = new Set<string>();
  const unicos: DadosDestinatario[] = [];
  for (const d of destinatarios) {
    const e = d.email?.trim().toLowerCase();
    if (!e || !e.includes("@") || vistos.has(e)) continue;
    vistos.add(e);
    unicos.push({ ...d, email: e });
  }
  if (unicos.length === 0) return;

  const supabase = criarSupabaseAdmin();
  const linhas = unicos.map((d) => ({
    tipo_evento: comum.tipoEvento,
    destinatario_email: d.email,
    destinatario_nome: d.nome,
    destinatario_profile_id: d.profileId ?? null,
    assunto: comum.assunto,
    payload: comum.payload,
    agendamento_id: comum.agendamentoId ?? null,
    veiculo_id: comum.veiculoId ?? null,
    status: "pendente" as const,
    tentativas: 0,
  }));
  const { error } = await supabase.from("email_outbox").insert(linhas);
  if (error) {
    throw new Error(`enfileirarEmailLote: ${error.message}`);
  }
}
