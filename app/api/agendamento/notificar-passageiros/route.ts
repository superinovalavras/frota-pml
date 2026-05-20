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
import { timestamptzParaIsoLocal } from "@/lib/data/mappers";

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
  const adicionados = listaDeStrings(corpo.adicionadosIds);
  const removidos = listaDeStrings(corpo.removidosIds);
  if (adicionados.length === 0 && removidos.length === 0) {
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
      "id, veiculo_id, solicitante_id, motorista_id, inicio, fim, dia_todo, destino, finalidade, local_partida, local_devolucao",
    )
    .eq("id", corpo.id)
    .maybeSingle();
  if (errResv || !reserva) {
    return NextResponse.json({ erro: "Reserva não encontrada." }, { status: 404 });
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
