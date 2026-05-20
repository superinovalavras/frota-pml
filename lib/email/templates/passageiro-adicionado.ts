/**
 * Template do email "passageiro_adicionado".
 *
 * Disparado quando um usuário do sistema é incluído como passageiro em
 * uma reserva existente. O destinatário é o próprio passageiro.
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
  localPartida?: string;
  localDevolucao?: string;
}
interface PayloadPessoa {
  nome: string;
  cargo?: string;
  telefone?: string;
  email?: string;
}

interface PayloadPassageiroAdicionado {
  reserva: PayloadReserva;
  veiculo: PayloadVeiculo;
  solicitante?: PayloadPessoa;
  motorista?: PayloadPessoa;
  /** Quem incluiu o passageiro (pode ser diferente do solicitante). */
  incluidoPor?: PayloadPessoa;
}

export function renderizarPassageiroAdicionado(
  destinatarioNome: string,
  payload: unknown,
): TemplateRenderizado {
  const p = payload as PayloadPassageiroAdicionado;
  const { reserva, veiculo } = p;
  const inicio = formatarDataHora(reserva.inicio);
  const fim = formatarDataHora(reserva.fim);
  const sa = saudacao(destinatarioNome);

  const assunto = `Você foi incluído(a) em uma viagem — ${reserva.destino}`;

  // Texto plano
  const partes: string[] = [];
  partes.push(`${sa}\n`);
  partes.push(
    `Você foi adicionado(a) como passageiro(a) em uma viagem do sistema FROTA PML.\n`,
  );
  partes.push(`Viagem:`);
  partes.push(`  Veículo:  ${veiculo.nome} (${veiculo.placa})`);
  partes.push(`  Período:  ${inicio} → ${fim}${reserva.diaTodo ? " (dia todo)" : ""}`);
  partes.push(`  Destino:  ${reserva.destino}`);
  if (reserva.finalidade) partes.push(`  Finalidade: ${reserva.finalidade}`);
  if (reserva.localPartida) partes.push(`  Saída em: ${reserva.localPartida}`);
  if (reserva.localDevolucao && reserva.localDevolucao !== reserva.localPartida) {
    partes.push(`  Retorno em: ${reserva.localDevolucao}`);
  }
  if (p.solicitante) {
    partes.push(``);
    partes.push(`Solicitante: ${p.solicitante.nome}${p.solicitante.cargo ? ` (${p.solicitante.cargo})` : ""}`);
    if (p.solicitante.telefone) partes.push(`  Tel: ${p.solicitante.telefone}`);
  }
  if (p.motorista) {
    partes.push(`Motorista: ${p.motorista.nome}`);
  }
  if (p.incluidoPor && p.incluidoPor.nome !== p.solicitante?.nome) {
    partes.push(``);
    partes.push(`Incluído por: ${p.incluidoPor.nome}`);
  }
  partes.push(``);
  partes.push(`— FROTA PML`);
  const texto = partes.join("\n");

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
    ...(reserva.localPartida
      ? [{ label: "Saída em", valor: escapar(reserva.localPartida) }]
      : []),
    ...(reserva.localDevolucao && reserva.localDevolucao !== reserva.localPartida
      ? [{ label: "Retorno em", valor: escapar(reserva.localDevolucao) }]
      : []),
  ]);

  const linhasPessoas: { label: string; valor: string }[] = [];
  if (p.solicitante) {
    linhasPessoas.push({
      label: "Solicitante",
      valor: p.solicitante.cargo
        ? `${escapar(p.solicitante.nome)} <span style="color:#6b7280">— ${escapar(p.solicitante.cargo)}</span>`
        : escapar(p.solicitante.nome),
    });
    if (p.solicitante.telefone) {
      linhasPessoas.push({ label: "Telefone", valor: escapar(p.solicitante.telefone) });
    }
  }
  if (p.motorista) {
    linhasPessoas.push({ label: "Motorista", valor: escapar(p.motorista.nome) });
  }
  if (p.incluidoPor && p.incluidoPor.nome !== p.solicitante?.nome) {
    linhasPessoas.push({ label: "Incluído por", valor: escapar(p.incluidoPor.nome) });
  }

  const corpo = `            <p style="margin:0 0 16px 0">${escapar(sa)}</p>
            <p style="margin:0 0 16px 0">Você foi <strong>adicionado(a) como passageiro(a)</strong> em uma viagem do sistema FROTA PML.</p>

            ${secao("Viagem", infoReserva)}

            ${linhasPessoas.length ? secao("Contatos", tabelaInfo(linhasPessoas)) : ""}

            <p style="margin:24px 0 0 0;color:#6b7280;font-size:13px">Você não precisa fazer nada. Caso não possa participar, avise o solicitante.</p>`;

  const html = layoutEmail({ titulo: "Viagem agendada", corpo, corHeader: "#0f766e" });

  return { assunto, html, texto };
}
