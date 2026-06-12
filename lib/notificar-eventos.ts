/**
 * Emissores de notificações internas disparados pelo NAVEGADOR (ações que
 * acontecem no cliente: designar motorista, confirmar reserva...). Eventos
 * de rotas server (cancelar, substituir, manutenção) inserem direto lá.
 *
 * Todas as funções são fire-and-forget: nunca quebram a ação principal.
 */
"use client";

import { criarNotificacoes } from "@/lib/data/notificacoes";
import { formatHora } from "@/lib/formatters";
import type { Agendamento, Usuario, Veiculo } from "@/lib/mock/types";

/** "qua., 10 de jun. · 08:00–12:00 · PYT-6155 Mobi · Destino: Centro" */
export function resumoViagem(
  a: Pick<Agendamento, "inicio" | "fim" | "diaTodo" | "destino">,
  veiculo?: Veiculo | null,
): string {
  const data = new Date(a.inicio).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const horario = a.diaTodo
    ? "dia todo"
    : `${formatHora(a.inicio)}–${formatHora(a.fim)}`;
  const linhas = [
    `${data} · ${horario}`,
    veiculo ? `${veiculo.placa} · ${veiculo.modelo}` : null,
    `Destino: ${a.destino}`,
  ].filter(Boolean);
  return linhas.join("\n");
}

/** Avisa o motorista que ele foi designado para uma viagem. */
export function notificarMotoristaDesignado(
  a: Agendamento,
  veiculo: Veiculo | undefined,
  solicitante: Usuario | undefined,
  atorId: string,
): void {
  if (!a.motoristaId || a.motoristaId === a.solicitanteId) return;
  void criarNotificacoes(
    [
      {
        destinatarioId: a.motoristaId,
        tipo: "motorista_designado",
        titulo: "Você foi designado como motorista",
        mensagem:
          resumoViagem(a, veiculo) +
          (solicitante ? `\nSolicitante: ${solicitante.nome}` : ""),
        agendamentoId: a.id,
        veiculoId: a.veiculoId,
      },
    ],
    atorId,
  );
}

/** Avisa solicitante e motorista que a reserva foi confirmada (pelo gestor). */
export function notificarReservaConfirmada(
  a: Agendamento,
  veiculo: Veiculo | undefined,
  atorId: string,
): void {
  const destinatarios = [a.solicitanteId, a.motoristaId].filter(
    (id): id is string => !!id,
  );
  void criarNotificacoes(
    destinatarios.map((destinatarioId) => ({
      destinatarioId,
      tipo: "reserva_confirmada" as const,
      titulo: "Reserva confirmada",
      mensagem: resumoViagem(a, veiculo),
      agendamentoId: a.id,
      veiculoId: a.veiculoId,
    })),
    atorId,
  );
}
