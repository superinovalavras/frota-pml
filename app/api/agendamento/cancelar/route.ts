/**
 * /api/agendamento/cancelar  (POST)
 *
 * Cancela uma reserva e notifica os envolvidos (solicitante, motorista,
 * passageiros usuário do sistema) por email.
 *
 * Body: { id: string, motivo?: string }
 *
 * Autorização:
 *   - master: pode cancelar qualquer reserva
 *   - gestor: pode cancelar reservas de veículos da sua secretaria
 *   - solicitante: pode cancelar a própria reserva
 *
 * O cancelamento por motivo de manutenção é feito por /api/manutencao
 * (com email mais rico — inclui veículos alternativos).
 */
import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase/server";
import { obterAtor } from "@/lib/api/autenticar";
import { enfileirarEmailLote } from "@/lib/email/outbox";
import { processarFila } from "@/lib/email/dispatcher";
import { inserirNotificacoes, resumoReservaServer } from "@/lib/notificar-server";
import type { Passageiro } from "@/lib/mock/types";
import { timestamptzParaIsoLocal } from "@/lib/data/mappers";

interface Corpo {
  id?: unknown;
  motivo?: unknown;
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
  const motivo =
    typeof corpo.motivo === "string" && corpo.motivo.trim()
      ? corpo.motivo.trim()
      : null;

  const aut = await obterAtor();
  if (!aut.ok) {
    return NextResponse.json({ erro: aut.mensagem }, { status: aut.status });
  }
  const ator = aut.ator;
  const admin = criarSupabaseAdmin();

  // Reserva + veículo
  const { data: reserva, error: errResv } = await admin
    .from("agendamentos")
    .select("*")
    .eq("id", corpo.id)
    .maybeSingle();
  if (errResv || !reserva) {
    return NextResponse.json({ erro: "Reserva não encontrada." }, { status: 404 });
  }

  // Permissões
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
          { erro: "Gestor só pode cancelar reservas da sua secretaria." },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json(
        { erro: "Apenas o solicitante, master ou gestor podem cancelar." },
        { status: 403 },
      );
    }
  }

  if (
    reserva.status === "cancelado" ||
    reserva.status === "concluido" ||
    reserva.status === "substituido"
  ) {
    return NextResponse.json(
      { erro: `Reserva já está com status "${reserva.status}".` },
      { status: 409 },
    );
  }

  // Atualiza status + appenda observação. O .eq("status", reserva.status)
  // garante que dois cancelamentos paralelos não enfileirem emails duplicados:
  // só uma das requests "ganha" o UPDATE; a outra recebe 0 linhas afetadas e
  // resolve como 409 sem reenfileirar.
  const obsCancel = motivo
    ? `[${new Date().toISOString()}] Cancelado por ${ator.nome}: ${motivo}`
    : `[${new Date().toISOString()}] Cancelado por ${ator.nome}.`;
  const novaObs = reserva.observacoes ? `${reserva.observacoes}\n\n${obsCancel}` : obsCancel;
  const { data: linhasUpd, error: errUpd } = await admin
    .from("agendamentos")
    .update({ status: "cancelado", observacoes: novaObs })
    .eq("id", corpo.id)
    .eq("status", reserva.status)
    .select("id");
  if (errUpd) {
    return NextResponse.json(
      { erro: `Falha ao cancelar: ${errUpd.message}` },
      { status: 500 },
    );
  }
  if (!linhasUpd || linhasUpd.length === 0) {
    return NextResponse.json(
      { erro: "Reserva mudou de estado entre a leitura e a gravação — recarregue e tente de novo." },
      { status: 409 },
    );
  }

  // Carrega veículo p/ enriquecer o email
  const { data: veiculo } = await admin
    .from("veiculos")
    .select("id, placa, modelo, marca")
    .eq("id", reserva.veiculo_id)
    .maybeSingle();
  const veiculoEmail = veiculo
    ? {
        id: veiculo.id,
        placa: veiculo.placa,
        nome:
          [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ").trim() ||
          veiculo.modelo,
      }
    : { id: reserva.veiculo_id, placa: "—", nome: "—" };

  // Coleta destinatários (sem o próprio ator se for o solicitante — opcional;
  // por ora notificamos todos pra deixar trilha)
  const ids = new Set<string>();
  ids.add(reserva.solicitante_id);
  if (reserva.motorista_id) ids.add(reserva.motorista_id);
  for (const p of (Array.isArray(reserva.passageiros)
    ? reserva.passageiros
    : []) as Passageiro[]) {
    if (p?.tipo === "usuario") ids.add(p.usuarioId);
  }

  // Notificação interna (sino) para os envolvidos — exceto quem cancelou.
  const resumoCancel = resumoReservaServer({
    inicio: timestamptzParaIsoLocal(reserva.inicio),
    fim: timestamptzParaIsoLocal(reserva.fim),
    diaTodo: reserva.dia_todo,
    destino: reserva.destino,
    veiculoPlaca: veiculoEmail.placa,
    veiculoNome: veiculoEmail.nome,
  });
  await inserirNotificacoes(
    admin,
    Array.from(ids).map((destinatarioId) => ({
      destinatarioId,
      tipo: "reserva_cancelada" as const,
      titulo: "Reserva cancelada",
      mensagem:
        resumoCancel +
        `\nCancelada por: ${ator.nome}` +
        (motivo ? `\nMotivo: ${motivo}` : ""),
      agendamentoId: reserva.id,
      veiculoId: veiculoEmail.id,
    })),
    ator.profileId,
  );

  let emailsEnfileirados = 0;
  let emailsEnviados = 0;
  if (ids.size > 0) {
    const { data: pessoas } = await admin
      .from("profiles")
      .select("id, nome, email")
      .in("id", Array.from(ids));
    const destinatarios = (pessoas ?? [])
      .filter((p) => !!p.email)
      .map((p) => ({ email: p.email, nome: p.nome, profileId: p.id }));

    if (destinatarios.length > 0) {
      // Classificação correta:
      // - "solicitante": o dono da reserva cancelou (independente do perfil).
      // - "gestor": alguém com permissão administrativa cancelou em nome de
      //   outro (master cancelando reserva alheia, gestor cancelando reserva
      //   de servidor da sua secretaria).
      const origem: "solicitante" | "gestor" = ehDono ? "solicitante" : "gestor";

      const payload = {
        reserva: {
          id: reserva.id,
          inicio: timestamptzParaIsoLocal(reserva.inicio),
          fim: timestamptzParaIsoLocal(reserva.fim),
          diaTodo: reserva.dia_todo,
          destino: reserva.destino,
          finalidade: reserva.finalidade,
        },
        veiculo: veiculoEmail,
        cancelamento: {
          origem,
          porQuem: ator.nome,
          cargoQuemCancelou: ator.cargo || undefined,
          contatoQuemCancelou: ator.telefone || ator.email || undefined,
          motivo: motivo ?? undefined,
        },
      };

      await enfileirarEmailLote(destinatarios, {
        tipoEvento: "agendamento_cancelado",
        assunto: `Reserva cancelada — veículo ${veiculoEmail.placa}`,
        payload,
        agendamentoId: reserva.id,
        veiculoId: veiculoEmail.id,
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
    emailsEnfileirados,
    emailsEnviados,
  });
}
