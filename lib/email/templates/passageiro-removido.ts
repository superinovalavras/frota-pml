/**
 * Template do email "passageiro_removido".
 *
 * Disparado quando um usuário do sistema é retirado de uma reserva
 * existente sem que a reserva inteira seja cancelada.
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
interface PayloadPessoa {
  nome: string;
  cargo?: string;
}

interface PayloadPassageiroRemovido {
  reserva: PayloadReserva;
  veiculo: PayloadVeiculo;
  removidoPor?: PayloadPessoa;
}

export function renderizarPassageiroRemovido(
  destinatarioNome: string,
  payload: unknown,
): TemplateRenderizado {
  const p = payload as PayloadPassageiroRemovido;
  const { reserva, veiculo } = p;
  const inicio = formatarDataHora(reserva.inicio);
  const fim = formatarDataHora(reserva.fim);
  const sa = saudacao(destinatarioNome);

  const assunto = `Você foi retirado(a) da viagem — ${reserva.destino}`;

  const partes: string[] = [];
  partes.push(`${sa}\n`);
  partes.push(`Você foi retirado(a) da lista de passageiros de uma viagem.\n`);
  partes.push(`Viagem:`);
  partes.push(`  Veículo:  ${veiculo.nome} (${veiculo.placa})`);
  partes.push(`  Período:  ${inicio} → ${fim}${reserva.diaTodo ? " (dia todo)" : ""}`);
  partes.push(`  Destino:  ${reserva.destino}`);
  if (reserva.finalidade) partes.push(`  Finalidade: ${reserva.finalidade}`);
  if (p.removidoPor) {
    partes.push(``);
    partes.push(`Retirado por: ${p.removidoPor.nome}${p.removidoPor.cargo ? ` (${p.removidoPor.cargo})` : ""}`);
  }
  partes.push(``);
  partes.push(`A viagem continua agendada — apenas você foi removido(a). Se isso for engano, entre em contato com o solicitante.`);
  partes.push(``);
  partes.push(`— FROTA PML`);
  const texto = partes.join("\n");

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

  const linhasRemovedor = p.removidoPor
    ? tabelaInfo([
        {
          label: "Retirado por",
          valor: p.removidoPor.cargo
            ? `${escapar(p.removidoPor.nome)} <span style="color:#6b7280">— ${escapar(p.removidoPor.cargo)}</span>`
            : escapar(p.removidoPor.nome),
        },
      ])
    : "";

  const corpo = `            <p style="margin:0 0 16px 0">${escapar(sa)}</p>
            <p style="margin:0 0 16px 0">Você foi <strong>retirado(a) da lista de passageiros</strong> de uma viagem.</p>

            ${secao("Viagem", infoReserva)}

            ${linhasRemovedor ? secao("Quem retirou", linhasRemovedor) : ""}

            <p style="margin:24px 0 0 0;color:#6b7280;font-size:13px">A viagem continua agendada — apenas você foi removido(a). Se isso for engano, entre em contato com o solicitante.</p>`;

  const html = layoutEmail({ titulo: "Removido da viagem", corpo, corHeader: "#7c2d12" });

  return { assunto, html, texto };
}
