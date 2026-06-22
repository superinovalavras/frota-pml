/**
 * Inserção de notificações internas a partir de rotas SERVER (admin client,
 * ignora RLS). Falha silenciosa: notificação nunca quebra a operação
 * principal (cancelamento, manutenção, etc.).
 *
 * Família de notificações (ver docs/ARQUITETURA.md §8): este é o emissor do
 * SERVIDOR. Cliente = notificar-eventos.ts; CRUD do sino = data/notificacoes.ts;
 * toasts de UI = notificacoes.ts.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificacaoTipoDb } from "@/lib/supabase/types";

export interface NovaNotificacaoServer {
  destinatarioId: string;
  tipo: NotificacaoTipoDb;
  titulo: string;
  mensagem: string;
  agendamentoId?: string | null;
  veiculoId?: string | null;
}

export async function inserirNotificacoes(
  admin: SupabaseClient<Database>,
  lote: NovaNotificacaoServer[],
  excluirId?: string | null,
): Promise<void> {
  const vistos = new Set<string>();
  const linhas = lote
    .filter((n) => {
      if (!n.destinatarioId || n.destinatarioId === excluirId) return false;
      const chave = `${n.destinatarioId}|${n.tipo}|${n.agendamentoId ?? ""}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .map((n) => ({
      destinatario_id: n.destinatarioId,
      tipo: n.tipo,
      titulo: n.titulo,
      mensagem: n.mensagem,
      agendamento_id: n.agendamentoId ?? null,
      veiculo_id: n.veiculoId ?? null,
    }));
  if (linhas.length === 0) return;
  const { error } = await admin.from("notificacoes").insert(linhas);
  if (error) console.error("inserirNotificacoes:", error.message);
}

/** Resumo curto de uma reserva para o corpo da notificação. */
export function resumoReservaServer(opts: {
  inicio: string; // ISO local
  fim: string;
  diaTodo?: boolean | null;
  destino?: string | null;
  veiculoNome?: string | null;
  veiculoPlaca?: string | null;
}): string {
  const d = new Date(opts.inicio);
  const data = Number.isNaN(d.getTime())
    ? opts.inicio
    : d.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });
  const hora = (iso: string) => {
    const x = new Date(iso);
    return Number.isNaN(x.getTime())
      ? ""
      : x.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };
  const horario = opts.diaTodo
    ? "dia todo"
    : `${hora(opts.inicio)}–${hora(opts.fim)}`;
  const linhas = [
    `${data} · ${horario}`,
    opts.veiculoPlaca
      ? `${opts.veiculoPlaca}${opts.veiculoNome ? ` · ${opts.veiculoNome}` : ""}`
      : null,
    opts.destino ? `Destino: ${opts.destino}` : null,
  ].filter(Boolean);
  return linhas.join("\n");
}
