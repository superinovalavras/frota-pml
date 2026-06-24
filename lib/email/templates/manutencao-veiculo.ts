/**
 * Template do email "manutencao_veiculo".
 *
 * Disparado quando um veículo é colocado em manutenção e suas reservas
 * futuras foram canceladas automaticamente. Um email por destinatário
 * por reserva afetada.
 */
import type { TemplateRenderizado } from "./tipos";
import {
  escapar,
  formatarData,
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
  localPartida?: string;
  localDevolucao?: string;
}
interface PayloadManutencao {
  motivo: string;
  previsaoRetorno: string | null; // YYYY-MM-DD, ou null = sem previsão
  registradoPor?: string;
}
interface PayloadAlternativa {
  id: string;
  placa: string;
  nome: string;
}

interface PayloadManutencaoVeiculo {
  reserva: PayloadReserva;
  veiculo: PayloadVeiculo;
  manutencao: PayloadManutencao;
  alternativas?: PayloadAlternativa[];
}

export function renderizarManutencaoVeiculo(
  destinatarioNome: string,
  payload: unknown,
): TemplateRenderizado {
  const p = payload as PayloadManutencaoVeiculo;
  const reserva = p.reserva;
  const veiculo = p.veiculo;
  const manut = p.manutencao;
  const alternativas = p.alternativas ?? [];

  const inicio = formatarDataHora(reserva.inicio);
  const fim = formatarDataHora(reserva.fim);
  const previsao = manut.previsaoRetorno
    ? formatarData(manut.previsaoRetorno)
    : "Sem previsão de retorno";
  const sa = saudacao(destinatarioNome);

  const assunto = `Reserva cancelada — veículo ${veiculo.placa} em manutenção`;

  const linhasAltTexto = alternativas.length
    ? alternativas
        .slice(0, 5)
        .map((a) => `  • ${a.placa} — ${a.nome}`)
        .join("\n")
    : "  (Nenhum veículo equivalente disponível no momento.)";

  const texto =
    `${sa}\n\n` +
    `Sua reserva no sistema FROTA PML foi cancelada porque o veículo entrou em manutenção.\n\n` +
    `Reserva cancelada:\n` +
    `  Veículo:  ${veiculo.nome} (${veiculo.placa})\n` +
    `  Período:  ${inicio} → ${fim}${reserva.diaTodo ? " (dia todo)" : ""}\n` +
    `  Destino:  ${reserva.destino}\n` +
    (reserva.finalidade ? `  Finalidade: ${reserva.finalidade}\n` : "") +
    `\n` +
    `Manutenção:\n` +
    `  Motivo:     ${manut.motivo}\n` +
    `  Previsão de retorno: ${previsao}\n` +
    (manut.registradoPor ? `  Registrado por: ${manut.registradoPor}\n` : "") +
    `\n` +
    `Veículos equivalentes disponíveis no momento:\n` +
    `${linhasAltTexto}\n\n` +
    `Acesse o sistema para registrar uma nova reserva se necessário.\n\n` +
    `— FROTA PML`;

  const linhasAltHtml = alternativas.length
    ? `<ul style="margin:8px 0 0 0;padding-left:20px">${alternativas
        .slice(0, 5)
        .map(
          (a) =>
            `<li><strong>${escapar(a.placa)}</strong> — ${escapar(a.nome)}</li>`,
        )
        .join("")}</ul>`
    : `<p style="margin:8px 0 0 0;color:#6b7280;font-style:italic">Nenhum veículo equivalente disponível no momento.</p>`;

  const corpo = `            <p style="margin:0 0 16px 0">${escapar(sa)}</p>
            <p style="margin:0 0 16px 0">Sua reserva foi <strong>cancelada</strong> porque o veículo entrou em manutenção.</p>

            ${secao(
              "Reserva cancelada",
              tabelaInfo([
                { label: "Veículo", valor: `${escapar(veiculo.nome)} (<strong>${escapar(veiculo.placa)}</strong>)` },
                {
                  label: "Período",
                  valor: `${escapar(inicio)} → ${escapar(fim)}${reserva.diaTodo ? " <em>(dia todo)</em>" : ""}`,
                },
                { label: "Destino", valor: escapar(reserva.destino) },
                ...(reserva.finalidade
                  ? [{ label: "Finalidade", valor: escapar(reserva.finalidade) }]
                  : []),
              ]),
            )}

            ${secao(
              "Manutenção",
              tabelaInfo([
                { label: "Motivo", valor: escapar(manut.motivo) },
                { label: "Previsão de retorno", valor: escapar(previsao) },
                ...(manut.registradoPor
                  ? [{ label: "Registrado por", valor: escapar(manut.registradoPor) }]
                  : []),
              ]),
            )}

            ${secao("Veículos equivalentes disponíveis", linhasAltHtml)}

            <p style="margin:24px 0 0 0;color:#6b7280;font-size:13px">Acesse o sistema FROTA PML para registrar uma nova reserva se necessário.</p>`;

  const html = layoutEmail({ titulo: "Reserva cancelada", corpo });

  return { assunto, html, texto };
}
