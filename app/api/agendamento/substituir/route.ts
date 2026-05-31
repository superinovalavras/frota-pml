/**
 * /api/agendamento/substituir  (POST)
 *
 * Substitui uma reserva existente por uma nova de hierarquia superior.
 * Operação atômica do ponto de vista do usuário:
 *   1) marca a reserva existente como `substituido` + appenda observação;
 *   2) cria a nova reserva (status "confirmado");
 *   3) enfileira `agendamento_cancelado` com origem="hierarquia" para
 *      solicitante/motorista/passageiros do existente (mensagem inclui
 *      quem substituiu);
 *   4) tenta enviar os emails inline; o cron faz retry se algo falhar.
 *
 * Body: {
 *   existenteId: string,
 *   novo: {
 *     veiculoId, solicitanteId, motoristaId|null,
 *     inicio, fim, diaTodo?, localPartida, localDevolucao,
 *     destino, finalidade, passageiros[], observacoes?
 *   }
 * }
 *
 * Autorização:
 *   - Master sempre pode.
 *   - Caso contrário, exige que a NOVA solicitante tenha hierarquia
 *     ESTRITAMENTE menor (= maior prioridade) que a do solicitante do
 *     existente. Além disso o ator precisa ser o próprio novo solicitante
 *     OU gestor da secretaria do veículo (quem cria em nome de outro).
 */
import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase/server";
import { obterAtor } from "@/lib/api/autenticar";
import { enfileirarEmailLote } from "@/lib/email/outbox";
import { processarFila } from "@/lib/email/dispatcher";
import { isoLocalParaTimestamptz, timestamptzParaIsoLocal } from "@/lib/data/mappers";
import type { Passageiro } from "@/lib/mock/types";

interface NovoAgendamento {
  veiculoId: string;
  solicitanteId: string;
  motoristaId: string | null;
  inicio: string;
  fim: string;
  diaTodo?: boolean;
  localPartida: string;
  localDevolucao: string;
  destino: string;
  finalidade: string;
  passageiros: Passageiro[];
  observacoes?: string;
}

interface Corpo {
  existenteId?: unknown;
  novo?: unknown;
}

function validarNovo(x: unknown): NovoAgendamento | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.veiculoId !== "string" || !o.veiculoId) return null;
  if (typeof o.solicitanteId !== "string" || !o.solicitanteId) return null;
  if (typeof o.inicio !== "string" || !o.inicio) return null;
  if (typeof o.fim !== "string" || !o.fim) return null;
  if (typeof o.localPartida !== "string") return null;
  if (typeof o.localDevolucao !== "string") return null;
  if (typeof o.destino !== "string") return null;
  if (typeof o.finalidade !== "string") return null;
  if (!Array.isArray(o.passageiros)) return null;
  return {
    veiculoId: o.veiculoId,
    solicitanteId: o.solicitanteId,
    motoristaId: typeof o.motoristaId === "string" ? o.motoristaId : null,
    inicio: o.inicio,
    fim: o.fim,
    diaTodo: !!o.diaTodo,
    localPartida: o.localPartida,
    localDevolucao: o.localDevolucao,
    destino: o.destino,
    finalidade: o.finalidade,
    passageiros: o.passageiros as Passageiro[],
    observacoes: typeof o.observacoes === "string" ? o.observacoes : undefined,
  };
}

export async function POST(req: Request) {
  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }
  if (typeof corpo.existenteId !== "string" || !corpo.existenteId) {
    return NextResponse.json({ erro: "existenteId obrigatório." }, { status: 400 });
  }
  const novo = validarNovo(corpo.novo);
  if (!novo) {
    return NextResponse.json({ erro: "Parâmetros do novo agendamento inválidos." }, { status: 400 });
  }

  const aut = await obterAtor();
  if (!aut.ok) {
    return NextResponse.json({ erro: aut.mensagem }, { status: aut.status });
  }
  const ator = aut.ator;
  const admin = criarSupabaseAdmin();

  // Reserva existente
  const { data: existente, error: errExist } = await admin
    .from("agendamentos")
    .select("*")
    .eq("id", corpo.existenteId)
    .maybeSingle();
  if (errExist || !existente) {
    return NextResponse.json({ erro: "Reserva existente não encontrada." }, { status: 404 });
  }

  if (
    existente.status === "cancelado" ||
    existente.status === "concluido" ||
    existente.status === "substituido"
  ) {
    return NextResponse.json(
      { erro: `Reserva existente já está com status "${existente.status}".` },
      { status: 409 },
    );
  }

  // Veículo
  const { data: veiculo } = await admin
    .from("veiculos")
    .select("id, placa, modelo, marca, secretaria_id")
    .eq("id", novo.veiculoId)
    .maybeSingle();
  if (!veiculo) {
    return NextResponse.json({ erro: "Veículo não encontrado." }, { status: 404 });
  }
  if (veiculo.id !== existente.veiculo_id) {
    return NextResponse.json(
      { erro: "A substituição precisa ser do mesmo veículo do existente." },
      { status: 400 },
    );
  }

  // Solicitantes (novo e existente) — precisa hierarquia + contato
  const { data: pessoas } = await admin
    .from("profiles")
    .select("id, nome, cargo, email, telefone, hierarquia, secretaria_id")
    .in("id", [novo.solicitanteId, existente.solicitante_id]);
  const novoSolic = pessoas?.find((p) => p.id === novo.solicitanteId) ?? null;
  const existenteSolic = pessoas?.find((p) => p.id === existente.solicitante_id) ?? null;
  if (!novoSolic) {
    return NextResponse.json({ erro: "Novo solicitante não encontrado." }, { status: 404 });
  }
  if (!existenteSolic) {
    return NextResponse.json(
      { erro: "Solicitante da reserva existente não encontrado." },
      { status: 404 },
    );
  }

  // Autorização por hierarquia: só master ignora; caso contrário a nova
  // hierarquia precisa ser estritamente menor (= maior prioridade).
  // Importante: null coage para 0 em comparações JS, o que dava `null >= 1` =
  // false e deixava passar. Tratamos null/undefined como "sem hierarquia
  // definida" → bloqueia explicitamente.
  const ehMaster = ator.perfil === "master";
  if (!ehMaster) {
    const hNovo = novoSolic.hierarquia;
    const hExist = existenteSolic.hierarquia;
    if (
      hNovo === null ||
      hNovo === undefined ||
      hExist === null ||
      hExist === undefined
    ) {
      return NextResponse.json(
        {
          erro: "Hierarquia indefinida em um dos perfis — não é possível avaliar a substituição.",
        },
        { status: 409 },
      );
    }
    if (hNovo >= hExist) {
      return NextResponse.json(
        {
          erro: "A substituição exige hierarquia superior à do solicitante atual.",
        },
        { status: 403 },
      );
    }
    // Ator precisa ser o próprio solicitante OU gestor da secretaria do veículo.
    const ehDono = ator.profileId === novo.solicitanteId;
    const ehGestorDaCasa =
      ator.perfil === "gestor" && veiculo.secretaria_id === ator.secretariaId;
    if (!ehDono && !ehGestorDaCasa) {
      return NextResponse.json(
        { erro: "Sem permissão para criar essa reserva em nome de outro." },
        { status: 403 },
      );
    }
  }

  // Conflito real entre os intervalos (defensivo — UI já checa, mas o cliente
  // pode mandar valores diferentes).
  const inicioNovoTs = isoLocalParaTimestamptz(novo.inicio);
  const fimNovoTs = isoLocalParaTimestamptz(novo.fim);
  const aN = new Date(inicioNovoTs).getTime();
  const bN = new Date(fimNovoTs).getTime();
  const aE = new Date(existente.inicio).getTime();
  const bE = new Date(existente.fim).getTime();
  if (Number.isNaN(aN) || Number.isNaN(bN) || aN >= bN) {
    return NextResponse.json({ erro: "Janela do novo agendamento inválida." }, { status: 400 });
  }
  if (!(aN < bE && bN > aE)) {
    return NextResponse.json(
      { erro: "Os agendamentos não se sobrepõem — não há o que substituir." },
      { status: 400 },
    );
  }

  // Verifica conflito com OUTRAS reservas do mesmo veículo (não pode entrar
  // sobre uma terceira reserva sem substituí-la também).
  const { data: outrasConflito } = await admin
    .from("agendamentos")
    .select("id, solicitante_id, status, inicio, fim")
    .eq("veiculo_id", veiculo.id)
    .neq("id", existente.id)
    .in("status", ["pendente", "confirmado", "em_andamento"])
    .lt("inicio", fimNovoTs)
    .gt("fim", inicioNovoTs);
  if (outrasConflito && outrasConflito.length > 0) {
    return NextResponse.json(
      {
        erro:
          "Há outras reservas conflitantes neste período além da que está sendo substituída.",
      },
      { status: 409 },
    );
  }

  // 1) Marca o existente como substituído. O .eq("status", existente.status)
  // garante atomicidade: duas substituições paralelas não conseguem ambas
  // marcar a mesma reserva como substituida.
  const obsSubst = `[${new Date().toISOString()}] Substituído por ${novoSolic.nome} (hierarquia superior).`;
  const novaObsExist = existente.observacoes
    ? `${existente.observacoes}\n\n${obsSubst}`
    : obsSubst;
  const { data: linhasMarc, error: errMarc } = await admin
    .from("agendamentos")
    .update({ status: "substituido", observacoes: novaObsExist })
    .eq("id", existente.id)
    .eq("status", existente.status)
    .select("id");
  if (errMarc) {
    return NextResponse.json(
      { erro: `Falha ao marcar substituição: ${errMarc.message}` },
      { status: 500 },
    );
  }
  if (!linhasMarc || linhasMarc.length === 0) {
    return NextResponse.json(
      { erro: "Reserva existente mudou de estado — recarregue e tente de novo." },
      { status: 409 },
    );
  }

  // 2) Cria a nova reserva (status "confirmado" — já passou pela autorização)
  const novoId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { error: errIns } = await admin.from("agendamentos").insert({
    id: novoId,
    veiculo_id: novo.veiculoId,
    solicitante_id: novo.solicitanteId,
    motorista_id: novo.motoristaId,
    inicio: inicioNovoTs,
    fim: fimNovoTs,
    dia_todo: !!novo.diaTodo,
    local_partida: novo.localPartida,
    local_devolucao: novo.localDevolucao,
    destino: novo.destino,
    finalidade: novo.finalidade,
    passageiros: novo.passageiros,
    status: "confirmado",
    observacoes: novo.observacoes ?? null,
    criado_em: new Date().toISOString(),
  });
  if (errIns) {
    // Tenta reverter a marcação. Se o próprio revert falhar, sinaliza
    // explicitamente no erro pro client mostrar pro usuário — caso contrário
    // a reserva original fica órfã em "substituido" sem ninguém saber.
    const { error: errRevert } = await admin
      .from("agendamentos")
      .update({ status: existente.status, observacoes: existente.observacoes })
      .eq("id", existente.id);
    if (errRevert) {
      console.error(
        `[substituir] Revert falhou — reserva ${existente.id} ficou órfã em "substituido". Erro original: ${errIns.message}. Erro revert: ${errRevert.message}`,
      );
      return NextResponse.json(
        {
          erro: `Falha ao criar nova reserva (${errIns.message}) e revert também falhou (${errRevert.message}). A reserva ${existente.id} ficou marcada como "substituido" — peça ao admin para restaurar manualmente.`,
          revertFalhou: true,
          existenteId: existente.id,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { erro: `Falha ao criar nova reserva: ${errIns.message}` },
      { status: 500 },
    );
  }

  // 3) Enfileira emails para os envolvidos no existente
  const veiculoEmail = {
    id: veiculo.id,
    placa: veiculo.placa,
    nome:
      [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ").trim() ||
      veiculo.modelo,
  };
  const ids = new Set<string>();
  ids.add(existente.solicitante_id);
  if (existente.motorista_id) ids.add(existente.motorista_id);
  for (const p of (Array.isArray(existente.passageiros)
    ? existente.passageiros
    : []) as Passageiro[]) {
    if (p?.tipo === "usuario") ids.add(p.usuarioId);
  }

  let emailsEnfileirados = 0;
  let emailsEnviados = 0;
  if (ids.size > 0) {
    const { data: destinatariosPerfil } = await admin
      .from("profiles")
      .select("id, nome, email")
      .in("id", Array.from(ids));
    const destinatarios = (destinatariosPerfil ?? [])
      .filter((p) => !!p.email)
      .map((p) => ({ email: p.email, nome: p.nome, profileId: p.id }));

    if (destinatarios.length > 0) {
      await enfileirarEmailLote(destinatarios, {
        tipoEvento: "agendamento_cancelado",
        assunto: `Reserva substituída — veículo ${veiculoEmail.placa}`,
        payload: {
          reserva: {
            id: existente.id,
            inicio: timestamptzParaIsoLocal(existente.inicio),
            fim: timestamptzParaIsoLocal(existente.fim),
            diaTodo: existente.dia_todo,
            destino: existente.destino,
            finalidade: existente.finalidade,
          },
          veiculo: veiculoEmail,
          cancelamento: {
            origem: "hierarquia",
            porQuem: novoSolic.nome,
            cargoQuemCancelou: novoSolic.cargo || undefined,
            contatoQuemCancelou:
              novoSolic.telefone || novoSolic.email || undefined,
          },
        },
        agendamentoId: existente.id,
        veiculoId: veiculo.id,
      });
      emailsEnfileirados = destinatarios.length;

      try {
        const resumo = await processarFila({ limite: emailsEnfileirados });
        emailsEnviados = resumo.enviados;
      } catch (e) {
        console.error("Dispatcher falhou (será reprocessado pelo cron):", e);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    novoId,
    emailsEnfileirados,
    emailsEnviados,
  });
}
