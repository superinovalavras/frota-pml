/**
 * Template do email "agendamento_cancelado".
 *
 * Disparado quando uma reserva é cancelada por iniciativa do solicitante
 * ou por substituição por hierarquia. Um email por destinatário envolvido
 * (solicitante, motorista e passageiros do sistema).
 *
 * Para cancelamento por manutenção use "manutencao_veiculo" (já mostra
 * alternativas e o motivo é específico).
 */
import type { TemplateRenderizado } from "./tipos";
import {
  escapar,
  formatarDataHora,
  layoutEmail,
  saudacao,
  secao,
  tabelaInfo,
} from "./helpers";

interface PayloadVeiculo {
  id: string;
  placa: string;
  nome: string;
}
interface PayloadReserva {
  id: string;
  inicio: string;
  fim: string;
  diaTodo?: boolean;
  destino: string;
  finalidade?: string;
}
interface PayloadCancelamento {
  /** "solicitante" — quem fez a reserva cancelou.
   *  "gestor" — gestor/master cancelou.
   *  "hierarquia" — outro servidor de hierarquia superior substituiu. */
  origem: "solicitante" | "gestor" | "hierarquia";
  /** Nome de quem efetuou o cancelamento (master/gestor ou o solicitante que substituiu). */
  porQuem?: string;
  /** Cargo de quem cancelou, útil quando origem = "hierarquia". */
  cargoQuemCancelou?: string;
  /** Contato (email ou telefone) — útil quando origem = "hierarquia". */
  contatoQuemCancelou?: string;
  /** Texto livre adicional (ex.: motivo informado). */
  motivo?: string;
}

interface PayloadAgendamentoCancelado {
  reserva: PayloadReserva;
  veiculo: PayloadVeiculo;
  cancelamento: PayloadCancelamento;
}

export function renderizarAgendamentoCancelado(
  destinatarioNome: string,
  payload: unknown,
): TemplateRenderizado {
  const p = payload as PayloadAgendamentoCancelado;
  const reserva = p.reserva;
  const veiculo = p.veiculo;
  const c = p.cancelamento;

  const inicio = formatarDataHora(reserva.inicio);
  const fim = formatarDataHora(reserva.fim);
  const sa = saudacao(destinatarioNome);

  const tituloCorpo =
    c.origem === "hierarquia"
      ? "Sua reserva foi substituída por outra de prioridade superior."
      : c.origem === "gestor"
        ? "Sua reserva foi cancelada pelo gestor."
        : "A reserva foi cancelada.";

  const assunto =
    c.origem === "hierarquia"
      ? `Reserva substituída — veículo ${veiculo.placa}`
      : `Reserva cancelada — veículo ${veiculo.placa}`;

  // Texto plano
  const linhasInfoTexto =
    `  Veículo:  ${veiculo.nome} (${veiculo.placa})\n` +
    `  Período:  ${inicio} → ${fim}${reserva.diaTodo ? " (dia todo)" : ""}\n` +
    `  Destino:  ${reserva.destino}\n` +
    (reserva.finalidade ? `  Finalidade: ${reserva.finalidade}\n` : "");

  const linhasCancelTexto =
    (c.porQuem ? `  Por:     ${c.porQuem}${c.cargoQuemCancelou ? ` (${c.cargoQuemCancelou})` : ""}\n` : "") +
    (c.contatoQuemCancelou ? `  Contato: ${c.contatoQuemCancelou}\n` : "") +
    (c.motivo ? `  Motivo:  ${c.motivo}\n` : "");

  const texto =
    `${sa}\n\n` +
    `${tituloCorpo}\n\n` +
    `Reserva cancelada:\n${linhasInfoTexto}\n` +
    (linhasCancelTexto ? `Cancelamento:\n${linhasCancelTexto}\n` : "") +
    `Acesse o sistema FROTA PML para registrar uma nova reserva se necessário.\n\n` +
    `— FROTA PML`;

  // HTML
  const infoReserva = tabelaInfo([
    { label: "Veículo", valor: `${escapar(veiculo.nome)} (<strong>${escapar(veiculo.placa)}</strong>)` },
    {
      label: "Período",
      valor: `${escapar(inicio)} → ${escapar(fim)}${reserva.diaTodo ? " <em>(dia todo)</em>" : ""}`,
    },
    { label: "Destino", valor: escapar(reserva.destino) },
    ...(reserva.finalidade
      ? [{ label: "Finalidade", valor: escapar(reserva.finalidade) }]
      : []),
  ]);

  const linhasCancel: { label: string; valor: string }[] = [];
  if (c.porQuem) {
    linhasCancel.push({
      label: c.origem === "hierarquia" ? "Substituída por" : "Cancelada por",
      valor: c.cargoQuemCancelou
        ? `${escapar(c.porQuem)} <span style="color:#6b7280">— ${escapar(c.cargoQuemCancelou)}</span>`
        : escapar(c.porQuem),
    });
  }
  if (c.contatoQuemCancelou) {
    linhasCancel.push({ label: "Contato", valor: escapar(c.contatoQuemCancelou) });
  }
  if (c.motivo) {
    linhasCancel.push({ label: "Motivo", valor: escapar(c.motivo) });
  }

  const corpo = `            <p style="margin:0 0 16px 0">${escapar(sa)}</p>
            <p style="margin:0 0 16px 0">${escapar(tituloCorpo)}</p>

            ${secao("Reserva cancelada", infoReserva)}

            ${linhasCancel.length ? secao("Cancelamento", tabelaInfo(linhasCancel)) : ""}

            <p style="margin:24px 0 0 0;color:#6b7280;font-size:13px">Acesse o sistema FROTA PML para registrar uma nova reserva se necessário.</p>`;

  const html = layoutEmail({ titulo: "Reserva cancelada", corpo });

  return { assunto, html, texto };
}
