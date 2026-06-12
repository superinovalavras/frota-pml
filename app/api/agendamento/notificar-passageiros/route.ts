/**
 * /api/agendamento/notificar-passageiros  (POST)
 *
 * Notifica usuários que foram adicionados ou removidos da lista de
 * passageiros de uma reserva. **Não muda o estado** — o client já gravou
 * a nova lista via upsert; esta rota só enfileira os emails.
 *
 * Body: {
 *   id: string,                      // id da reserva
 *   adicionadosIds: string[],        // ids de profiles incluídos
 *   removidosIds:   string[]         // ids de profiles retirados
 * }
 *
 * Autorização: master, gestor da secretaria do veículo, ou o solicitante.
 */
import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase/server";
import { obterAtor } from "@/lib/api/autenticar";
import { enfileirarEmailLote } from "@/lib/email/outbox";
import { processarFila } from "@/lib/email/dispatcher";
import { inserirNotificacoes, resumoReservaServer } from "@/lib/notificar-server";
import { timestamptzParaIsoLocal } from "@/lib/data/mappers";
import type { Passageiro } from "@/lib/mock/types";

interface Corpo {
  id?: unknown;
  adicionadosIds?: unknown;
  removidosIds?: unknown;
}

function listaDeStrings(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return Array.from(
    new Set(x.filter((s): s is string => typeof s === "string" && s.length > 0)),
  );
}

export async function POST(req: Request) {
  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }
  if (typeof corpo.id !== "string" || !corpo.id) {
    return NextResponse.json({ erro: "id obrigatório." }, { status: 400 });
  }
  const adicionadosBrutos = listaDeStrings(corpo.adicionadosIds);
  const removidosBrutos = listaDeStrings(corpo.removidosIds);
  if (adicionadosBrutos.length === 0 && removidosBrutos.length === 0) {
    return NextResponse.json({ ok: true, emailsEnfileirados: 0 });
  }

  const aut = await obterAtor();
  if (!aut.ok) {
    return NextResponse.json({ erro: aut.mensagem }, { status: aut.status });
  }
  const ator = aut.ator;
  const admin = criarSupabaseAdmin();

  const { data: reserva, error: errResv } = await admin
    .from("agendamentos")
    .select(
      "id, veiculo_id, solicitante_id, motorista_id, inicio, fim, dia_todo, destino, finalidade, local_partida, local_devolucao, passageiros, status",
    )
    .eq("id", corpo.id)
    .maybeSingle();
  if (errResv || !reserva) {
    return NextResponse.json({ erro: "Reserva não encontrada." }, { status: 404 });
  }

  // Não notifica reservas que ainda dependem de aprovação ou já saíram do ar:
  // - pendente: o gestor pode recusar; passageiro receberia aviso prematuro.
  // - cancelado/substituido/concluido: motivações distintas têm rotas próprias.
  if (
    reserva.status === "pendente" ||
    reserva.status === "cancelado" ||
    reserva.status === "substituido" ||
    reserva.status === "concluido"
  ) {
    return NextResponse.json({
      ok: true,
      emailsEnfileirados: 0,
      observacao: `Reserva com status "${reserva.status}" — notificação suprimida.`,
    });
  }

  // Autorização
  const ehDono = reserva.solicitante_id === ator.profileId;
  const ehMaster = ator.perfil === "master";
  if (!ehMaster && !ehDono) {
    if (ator.perfil === "gestor") {
      const { data: veic } = await admin
        .from("veiculos")
        .select("secretaria_id")
        .eq("id", reserva.veiculo_id)
        .maybeSingle();
      if (!veic || veic.secretaria_id !== ator.secretariaId) {
        return NextResponse.json(
          { erro: "Gestor só pode notificar reservas da sua secretaria." },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json(
        { erro: "Apenas o solicitante, master ou gestor podem notificar." },
        { status: 403 },
      );
    }
  }

  // Reconcilia adicionados/removidos com a lista REAL de passageiros.
  // - "adicionados" só sai se o id está realmente em reserva.passageiros
  //   agora (o client já gravou a nova lista antes de chamar esta rota).
  // - "removidos" só sai se o id NÃO está em reserva.passageiros.
  // Sem isso, um caller autorizado conseguiria enviar emails referenciando
  // a reserva para ids arbitrários.
  const idsAtuais = new Set<string>();
  for (const p of (Array.isArray(reserva.passageiros)
    ? reserva.passageiros
    : []) as Passageiro[]) {
    if (p?.tipo === "usuario" && typeof p.usuarioId === "string") {
      idsAtuais.add(p.usuarioId);
    }
  }
  const adicionados = adicionadosBrutos.filter((id) => idsAtuais.has(id));
  const removidos = removidosBrutos.filter((id) => !idsAtuais.has(id));
  if (adicionados.length === 0 && removidos.length === 0) {
    return NextResponse.json({
      ok: true,
      emailsEnfileirados: 0,
      observacao: "Nada a notificar — diff não bate com a lista atual.",
    });
  }

  // Veículo
  const { data: veiculo } = await admin
    .from("veiculos")
    .select("id, placa, modelo, marca")
    .eq("id", reserva.veiculo_id)
    .maybeSingle();
  const veiculoEmail = veiculo
    ? {
        placa: veiculo.placa,
        nome:
          [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ").trim() ||
          veiculo.modelo,
      }
    : { placa: "—", nome: "—" };

  // Solicitante + motorista (p/ contexto nos emails de "adicionado")
  const idsContexto = new Set<string>();
  idsContexto.add(reserva.solicitante_id);
  if (reserva.motorista_id) idsContexto.add(reserva.motorista_id);
  const { data: pessoasContexto } = await admin
    .from("profiles")
    .select("id, nome, cargo, telefone, email")
    .in("id", Array.from(idsContexto));
  const mapaContexto = new Map(
    (pessoasContexto ?? []).map((p) => [p.id, p]),
  );
  const solicitante = mapaContexto.get(reserva.solicitante_id);
  const motorista = reserva.motorista_id
    ? mapaContexto.get(reserva.motorista_id)
    : null;

  const reservaPayload = {
    id: reserva.id,
    inicio: timestamptzParaIsoLocal(reserva.inicio),
    fim: timestamptzParaIsoLocal(reserva.fim),
    diaTodo: reserva.dia_todo,
    destino: reserva.destino,
    finalidade: reserva.finalidade,
    localPartida: reserva.local_partida,
    localDevolucao: reserva.local_devolucao,
  };

  // Notificações internas (sino) — adicionados e removidos.
  const resumoSino = resumoReservaServer({
    inicio: reservaPayload.inicio,
    fim: reservaPayload.fim,
    diaTodo: reservaPayload.diaTodo,
    destino: reservaPayload.destino,
    veiculoPlaca: veiculoEmail.placa,
    veiculoNome: veiculoEmail.nome,
  });
  await inserirNotificacoes(
    admin,
    [
      ...adicionados.map((destinatarioId) => ({
        destinatarioId,
        tipo: "passageiro_adicionado" as const,
        titulo: "Você foi incluído(a) em uma viagem",
        mensagem:
          resumoSino +
          (solicitante ? `\nSolicitante: ${solicitante.nome}` : "") +
          (motorista ? `\nMotorista: ${motorista.nome}` : ""),
        agendamentoId: reserva.id,
        veiculoId: reserva.veiculo_id,
      })),
      ...removidos.map((destinatarioId) => ({
        destinatarioId,
        tipo: "passageiro_removido" as const,
        titulo: "Você foi retirado(a) de uma viagem",
        mensagem: resumoSino,
        agendamentoId: reserva.id,
        veiculoId: reserva.veiculo_id,
      })),
    ],
    ator.profileId,
  );

  let emailsEnfileirados = 0;

  // Adicionados
  if (adicionados.length > 0) {
    const { data: incluidos } = await admin
      .from("profiles")
      .select("id, nome, email")
      .in("id", adicionados);
    const destinatarios = (incluidos ?? [])
      .filter((p) => !!p.email)
      .map((p) => ({ email: p.email, nome: p.nome, profileId: p.id }));
    if (destinatarios.length > 0) {
      await enfileirarEmailLote(destinatarios, {
        tipoEvento: "passageiro_adicionado",
        assunto: `Você foi incluído(a) em uma viagem — ${reserva.destino}`,
        payload: {
          reserva: reservaPayload,
          veiculo: veiculoEmail,
          solicitante: solicitante
            ? {
                nome: solicitante.nome,
                cargo: solicitante.cargo || undefined,
                telefone: solicitante.telefone || undefined,
                email: solicitante.email || undefined,
              }
            : undefined,
          motorista: motorista ? { nome: motorista.nome } : undefined,
          incluidoPor: { nome: ator.nome, cargo: ator.cargo || undefined },
        },
        agendamentoId: reserva.id,
        veiculoId: reserva.veiculo_id,
      });
      emailsEnfileirados += destinatarios.length;
    }
  }

  // Removidos
  if (removidos.length > 0) {
    const { data: retirados } = await admin
      .from("profiles")
      .select("id, nome, email")
      .in("id", removidos);
    const destinatarios = (retirados ?? [])
      .filter((p) => !!p.email)
      .map((p) => ({ email: p.email, nome: p.nome, profileId: p.id }));
    if (destinatarios.length > 0) {
      await enfileirarEmailLote(destinatarios, {
        tipoEvento: "passageiro_removido",
        assunto: `Você foi retirado(a) da viagem — ${reserva.destino}`,
        payload: {
          reserva: reservaPayload,
          veiculo: veiculoEmail,
          removidoPor: { nome: ator.nome, cargo: ator.cargo || undefined },
        },
        agendamentoId: reserva.id,
        veiculoId: reserva.veiculo_id,
      });
      emailsEnfileirados += destinatarios.length;
    }
  }

  let emailsEnviados = 0;
  if (emailsEnfileirados > 0) {
    try {
      const resumo = await processarFila({ limite: emailsEnfileirados });
      emailsEnviados = resumo.enviados;
    } catch (e) {
      console.error("Dispatcher falhou (será reprocessado pelo cron):", e);
    }
  }

  return NextResponse.json({ ok: true, emailsEnfileirados, emailsEnviados });
}
