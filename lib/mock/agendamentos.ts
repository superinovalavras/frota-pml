import type { Agendamento } from "./types";

/**
 * Gera um conjunto de agendamentos seed relativos à data de hoje. Isso garante
 * que a agenda esteja sempre populada (com reservas ontem, hoje e nos próximos
 * dias) independente de quando a demo for aberta.
 */
function isoLocal(data: Date, hora: number, minuto: number): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(hora)}:${pad(minuto)}:00`;
}

function deslocarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d;
}

/** Conjunto inicial de reservas — usado apenas se o localStorage estiver vazio. */
export function gerarAgendamentosSeed(referencia: Date = new Date()): Agendamento[] {
  const hoje = new Date(referencia);
  hoje.setHours(0, 0, 0, 0);

  const ontem = deslocarDias(hoje, -1);
  const amanha = deslocarDias(hoje, 1);
  const depois = deslocarDias(hoje, 2);
  const semanaPassada = deslocarDias(hoje, -3);
  const proximaSemana = deslocarDias(hoje, 5);

  const criadoBase = new Date(referencia).toISOString();

  return [
    // 1. EM ANDAMENTO — hoje cedo, com check-in feito
    {
      id: "ag-seed-1",
      veiculoId: "v-polo",
      solicitanteId: "u-rennan",
      motoristaId: "u-motorista-jose",
      inicio: isoLocal(hoje, 8, 30),
      fim: isoLocal(hoje, 12, 0),
      localPartida: "Pátio da SDES",
      localDevolucao: "Pátio da SDES",
      destino: "Centro Administrativo",
      finalidade: "Reunião de alinhamento sobre o programa Cidade Inteligente",
      passageiros: [{ tipo: "usuario", usuarioId: "u-raquel" }],
      status: "em_andamento",
      observacoes: "Sair com 15min de folga — trânsito na Av. Padre Vieira.",
      criadoEm: criadoBase,
      checkinEm: isoLocal(hoje, 8, 28),
      kmSaida: 19875,
      obsSaida: "Veículo em ordem, tanque cheio.",
    },

    // 2. CONFIRMADO — hoje tarde
    {
      id: "ag-seed-2",
      veiculoId: "v-mobi",
      solicitanteId: "u-raquel",
      motoristaId: "u-raquel",
      inicio: isoLocal(hoje, 14, 30),
      fim: isoLocal(hoje, 17, 0),
      localPartida: "Pátio da SDES",
      localDevolucao: "Pátio da SDES",
      destino: "Universidade Federal de Lavras (UFLA)",
      finalidade: "Reunião com NIT/UFLA sobre parceria de inovação",
      passageiros: [],
      status: "confirmado",
      criadoEm: criadoBase,
    },

    // 3. PENDENTE — amanhã (servidor sem auto-aprovação)
    {
      id: "ag-seed-3",
      veiculoId: "v-sprinter",
      solicitanteId: "u-raquel",
      motoristaId: "u-motorista-jose",
      inicio: isoLocal(amanha, 8, 0),
      fim: isoLocal(amanha, 18, 0),
      localPartida: "Pátio da SDES",
      localDevolucao: "Pátio da SDES",
      destino: "Belo Horizonte — SEDE/MG",
      finalidade: "Caravana de gestores municipais — reunião na SEDE",
      passageiros: [
        { tipo: "usuario", usuarioId: "u-rennan" },
        { tipo: "usuario", usuarioId: "u-bruno" },
        { tipo: "convidado", nome: "Dra. Cláudia Furtado", motivo: "Convidada UFLA" },
      ],
      status: "pendente",
      observacoes: "Confirmar disponibilidade de pedágio e diária do motorista.",
      criadoEm: criadoBase,
    },

    // 4. CONFIRMADO — dia inteiro, depois de amanhã
    {
      id: "ag-seed-4",
      veiculoId: "v-polo",
      solicitanteId: "u-bruno",
      motoristaId: "u-bruno",
      inicio: isoLocal(depois, 0, 0),
      fim: isoLocal(depois, 23, 59),
      diaTodo: true,
      localPartida: "Pátio da SDES",
      localDevolucao: "Pátio da SDES",
      destino: "Bairros do entorno — Itinerante",
      finalidade: "Vistorias do programa Regulariza Lavras",
      passageiros: [],
      status: "confirmado",
      criadoEm: criadoBase,
    },

    // 5. CONCLUÍDO — semana passada, com check-in e check-out completos
    {
      id: "ag-seed-5",
      veiculoId: "v-mobi",
      solicitanteId: "u-rodolfo",
      motoristaId: "u-rodolfo",
      inicio: isoLocal(semanaPassada, 9, 0),
      fim: isoLocal(semanaPassada, 11, 30),
      localPartida: "Pátio da SDES",
      localDevolucao: "Pátio da SDES",
      destino: "Câmara Municipal de Lavras",
      finalidade: "Apresentação do plano de inovação à Comissão de Finanças",
      passageiros: [{ tipo: "usuario", usuarioId: "u-rennan" }],
      status: "concluido",
      criadoEm: criadoBase,
      checkinEm: isoLocal(semanaPassada, 8, 55),
      kmSaida: 19850,
      obsSaida: "Tanque 3/4. Combustível disponível.",
      checkoutEm: isoLocal(semanaPassada, 11, 38),
      kmRetorno: 19875,
      obsRetorno: "Sem ocorrências. Retornado em ordem.",
    },

    // 6. PRÓXIMA SEMANA — confirmado, simulando reunião planejada
    {
      id: "ag-seed-6",
      veiculoId: "v-sprinter",
      solicitanteId: "u-rennan",
      motoristaId: "u-motorista-jose",
      inicio: isoLocal(proximaSemana, 7, 0),
      fim: isoLocal(proximaSemana, 19, 30),
      localPartida: "Pátio da SDES",
      localDevolucao: "Pátio da SDES",
      destino: "Varginha — IFSULDEMINAS",
      finalidade: "Visita técnica ao programa de Cidades Inteligentes",
      passageiros: [
        { tipo: "usuario", usuarioId: "u-raquel" },
        { tipo: "usuario", usuarioId: "u-bruno" },
      ],
      status: "confirmado",
      criadoEm: criadoBase,
    },

    // 7. CANCELADO — ontem (mostra status cancelado na agenda)
    {
      id: "ag-seed-7",
      veiculoId: "v-polo",
      solicitanteId: "u-raquel",
      motoristaId: "u-raquel",
      inicio: isoLocal(ontem, 10, 0),
      fim: isoLocal(ontem, 12, 0),
      localPartida: "Pátio da SDES",
      localDevolucao: "Pátio da SDES",
      destino: "SEBRAE Lavras",
      finalidade: "Workshop de inovação aberta",
      passageiros: [],
      status: "cancelado",
      observacoes: "Workshop adiado pelo SEBRAE para o próximo mês.",
      criadoEm: criadoBase,
    },
  ];
}
