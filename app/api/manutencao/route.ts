/**
 * /api/manutencao
 *
 * POST   — coloca um veículo em manutenção:
 *          1) cria registro em `manutencoes`
 *          2) muda `veiculos.status = "manutencao"`
 *          3) cancela reservas afetadas (status pendente/confirmado/em_andamento
 *             com início até `previsaoRetorno`) acrescentando observação
 *          4) enfileira emails para solicitante + motorista + passageiros
 *             usuário de cada reserva afetada
 *
 * DELETE — encerra a manutenção ativa:
 *          1) marca `encerrado_em = now()` na manutenção ativa
 *          2) muda `veiculos.status = "disponivel"`
 *
 * Autorização: apenas master ou gestor da secretaria do veículo.
 */
import { NextResponse } from "next/server";
import { criarSupabaseAdmin, criarSupabaseServer } from "@/lib/supabase/server";
import { enfileirarEmailLote } from "@/lib/email/outbox";
import { processarFila } from "@/lib/email/dispatcher";
import { inserirNotificacoes, resumoReservaServer } from "@/lib/notificar-server";
import { timestamptzParaIsoLocal } from "@/lib/data/mappers";

type CorpoPost = {
  veiculoId?: unknown;
  motivo?: unknown;
  previsaoRetorno?: unknown;
};

type CorpoDelete = {
  veiculoId?: unknown;
};

interface PerfilAtor {
  profileId: string;
  perfil: string;
  secretariaId: string;
  nome: string;
}

async function autorizar(): Promise<
  | { ok: true; ator: PerfilAtor }
  | { ok: false; status: number; mensagem: string }
> {
  const supa = await criarSupabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) {
    return { ok: false, status: 401, mensagem: "Não autenticado." };
  }
  const admin = criarSupabaseAdmin();
  const { data: perfil, error } = await admin
    .from("profiles")
    .select("id, nome, perfil, secretaria_id")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (error || !perfil) {
    return { ok: false, status: 403, mensagem: "Perfil não encontrado." };
  }
  if (perfil.perfil !== "master" && perfil.perfil !== "gestor") {
    return { ok: false, status: 403, mensagem: "Apenas master ou gestor podem alterar manutenção." };
  }
  return {
    ok: true,
    ator: {
      profileId: perfil.id,
      perfil: perfil.perfil,
      secretariaId: perfil.secretaria_id,
      nome: perfil.nome,
    },
  };
}

// ----------------------------------------------------------------------
// POST — colocar em manutenção
// ----------------------------------------------------------------------
export async function POST(req: Request) {
  let corpo: CorpoPost;
  try {
    corpo = (await req.json()) as CorpoPost;
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }
  const { veiculoId, motivo, previsaoRetorno } = corpo;
  if (
    typeof veiculoId !== "string" ||
    !veiculoId ||
    typeof motivo !== "string" ||
    !motivo.trim()
  ) {
    return NextResponse.json(
      { erro: "Parâmetros inválidos: exija veiculoId e motivo (texto)." },
      { status: 400 },
    );
  }
  // previsaoRetorno é OPCIONAL: "YYYY-MM-DD" ou ausente (= sem previsão).
  let previsao: string | null = null;
  if (typeof previsaoRetorno === "string" && previsaoRetorno.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(previsaoRetorno)) {
      return NextResponse.json(
        { erro: "previsaoRetorno deve ser uma data YYYY-MM-DD (ou ausente)." },
        { status: 400 },
      );
    }
    previsao = previsaoRetorno;
  }
  const motivoLimpo = motivo.trim();

  const aut = await autorizar();
  if (!aut.ok) {
    return NextResponse.json({ erro: aut.mensagem }, { status: aut.status });
  }
  const ator = aut.ator;
  const admin = criarSupabaseAdmin();

  // Carrega o veículo (sem RLS) — precisa pra checar secretaria e dados pro email.
  const { data: veiculo, error: errVeic } = await admin
    .from("veiculos")
    .select("*")
    .eq("id", veiculoId)
    .maybeSingle();
  if (errVeic || !veiculo) {
    return NextResponse.json({ erro: "Veículo não encontrado." }, { status: 404 });
  }
  if (ator.perfil === "gestor" && veiculo.secretaria_id !== ator.secretariaId) {
    return NextResponse.json(
      { erro: "Gestor só pode gerenciar veículos da própria secretaria." },
      { status: 403 },
    );
  }

  // Já existe manutenção ativa?
  const { data: ativa } = await admin
    .from("manutencoes")
    .select("id")
    .eq("veiculo_id", veiculoId)
    .is("encerrado_em", null)
    .maybeSingle();
  if (ativa) {
    return NextResponse.json(
      { erro: "Este veículo já está em manutenção." },
      { status: 409 },
    );
  }

  // Reservas afetadas: ativas (pendente/confirmado/em_andamento). COM previsão,
  // só as que começam até o fim daquele dia; SEM previsão (indeterminada),
  // todas as ativas — o veículo sai por tempo indefinido.
  let qReservas = admin
    .from("agendamentos")
    .select("*")
    .eq("veiculo_id", veiculoId)
    .in("status", ["pendente", "confirmado", "em_andamento"]);
  if (previsao) {
    qReservas = qReservas.lte("inicio", `${previsao}T23:59:59-03:00`);
  }
  const { data: reservasAfetadas, error: errResv } = await qReservas;
  if (errResv) {
    return NextResponse.json(
      { erro: `Falha ao buscar reservas: ${errResv.message}` },
      { status: 500 },
    );
  }
  const reservas = reservasAfetadas ?? [];

  // Cria a manutenção
  const { data: manutCriada, error: errManut } = await admin
    .from("manutencoes")
    .insert({
      veiculo_id: veiculoId,
      motivo: motivoLimpo,
      previsao_retorno: previsao,
      criado_por: ator.profileId,
    })
    .select("id")
    .single();
  if (errManut || !manutCriada) {
    return NextResponse.json(
      { erro: `Falha ao criar manutenção: ${errManut?.message}` },
      { status: 500 },
    );
  }

  // Atualiza o status do veículo
  const { error: errVeicUpd } = await admin
    .from("veiculos")
    .update({ status: "manutencao" })
    .eq("id", veiculoId);
  if (errVeicUpd) {
    return NextResponse.json(
      { erro: `Falha ao atualizar veículo: ${errVeicUpd.message}` },
      { status: 500 },
    );
  }

  // Calcula veículos alternativos (mesma secretaria, mesma CNH exigida, status
  // "disponivel" no momento, exclui o próprio veículo). Sem filtro fino por
  // janela — o destinatário avalia caso a caso.
  const { data: alternativos } = await admin
    .from("veiculos")
    .select("id, placa, modelo, marca, cnh_exigida, superintendencia_id, status")
    .eq("secretaria_id", veiculo.secretaria_id)
    .eq("cnh_exigida", veiculo.cnh_exigida)
    .eq("status", "disponivel")
    .neq("id", veiculoId);
  const veiculosAlternativos = (alternativos ?? []).map((v) => ({
    id: v.id,
    placa: v.placa,
    nome: [v.marca, v.modelo].filter(Boolean).join(" ").trim() || v.modelo,
    cnhExigida: v.cnh_exigida,
    superintendenciaId: v.superintendencia_id,
  }));

  // Notificação interna para TODOS os usuários: o veículo entrou em manutenção.
  const nomeVeicManut =
    [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ").trim() ||
    veiculo.modelo;
  const { data: todos } = await admin.from("profiles").select("id");
  await inserirNotificacoes(
    admin,
    (todos ?? []).map((p) => ({
      destinatarioId: p.id,
      tipo: "veiculo_manutencao" as const,
      titulo: "Veículo em manutenção",
      mensagem: `${veiculo.placa} · ${nomeVeicManut} entrou em manutenção.\nMotivo: ${motivoLimpo}\nPrevisão de retorno: ${previsao ?? "sem previsão"}`,
      veiculoId: veiculo.id,
    })),
    ator.profileId,
  );

  let reservasCanceladas = 0;
  let emailsEnfileirados = 0;

  // Para cada reserva afetada: cancela e enfileira emails.
  for (const r of reservas) {
    const observacaoCancelamento = `Cancelado automaticamente: veículo em manutenção. Motivo: ${motivoLimpo}`;
    const novaObs = r.observacoes
      ? `${r.observacoes}\n\n[${new Date().toISOString()}] ${observacaoCancelamento}`
      : observacaoCancelamento;

    const { error: errUpd } = await admin
      .from("agendamentos")
      .update({ status: "cancelado", observacoes: novaObs })
      .eq("id", r.id);
    if (errUpd) {
      console.error(`Falha ao cancelar reserva ${r.id}: ${errUpd.message}`);
      continue;
    }
    reservasCanceladas += 1;

    // Coleta destinatários: solicitante, motorista (se diferente) e
    // passageiros usuário (FK ao profile).
    const idsDestino = new Set<string>();
    idsDestino.add(r.solicitante_id);
    if (r.motorista_id) idsDestino.add(r.motorista_id);
    const passageiros = Array.isArray(r.passageiros) ? r.passageiros : [];
    for (const p of passageiros as Array<{ tipo: string; usuarioId?: string }>) {
      if (p?.tipo === "usuario" && typeof p.usuarioId === "string") {
        idsDestino.add(p.usuarioId);
      }
    }
    if (idsDestino.size === 0) continue;

    // Notificação interna (sino) — reserva cancelada por manutenção.
    await inserirNotificacoes(
      admin,
      Array.from(idsDestino).map((destinatarioId) => ({
        destinatarioId,
        tipo: "veiculo_manutencao" as const,
        titulo: "Reserva cancelada — veículo em manutenção",
        mensagem:
          resumoReservaServer({
            inicio: timestamptzParaIsoLocal(r.inicio),
            fim: timestamptzParaIsoLocal(r.fim),
            diaTodo: r.dia_todo,
            destino: r.destino,
            veiculoPlaca: veiculo.placa,
            veiculoNome:
              [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ").trim() ||
              veiculo.modelo,
          }) +
          `\nMotivo: ${motivoLimpo}\nPrevisão de retorno: ${previsao ?? "sem previsão"}`,
        agendamentoId: r.id,
        veiculoId: veiculo.id,
      })),
      ator.profileId,
    );

    const { data: pessoas } = await admin
      .from("profiles")
      .select("id, nome, email")
      .in("id", Array.from(idsDestino));

    const destinatarios = (pessoas ?? [])
      .filter((p) => !!p.email)
      .map((p) => ({
        email: p.email,
        nome: p.nome,
        profileId: p.id,
      }));
    if (destinatarios.length === 0) continue;

    const payload = {
      reserva: {
        id: r.id,
        inicio: timestamptzParaIsoLocal(r.inicio),
        fim: timestamptzParaIsoLocal(r.fim),
        diaTodo: r.dia_todo,
        destino: r.destino,
        finalidade: r.finalidade,
        localPartida: r.local_partida,
        localDevolucao: r.local_devolucao,
        solicitanteId: r.solicitante_id,
        motoristaId: r.motorista_id,
      },
      veiculo: {
        id: veiculo.id,
        placa: veiculo.placa,
        nome: [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ").trim() || veiculo.modelo,
      },
      manutencao: {
        motivo: motivoLimpo,
        previsaoRetorno: previsao,
        registradoPor: ator.nome,
      },
      alternativas: veiculosAlternativos,
    };

    await enfileirarEmailLote(destinatarios, {
      tipoEvento: "manutencao_veiculo",
      assunto: `Reserva cancelada — veículo ${veiculo.placa} em manutenção`,
      payload,
      agendamentoId: r.id,
      veiculoId: veiculo.id,
    });
    emailsEnfileirados += destinatarios.length;
  }

  // Tenta enviar os emails enfileirados de imediato — assim o destinatário
  // recebe em segundos. Se algo falhar, o cron de /api/email/dispatch
  // reprocessa depois. Não bloqueia a resposta em caso de erro.
  let emailsEnviados = 0;
  if (emailsEnfileirados > 0) {
    try {
      const resumo = await processarFila({ limite: emailsEnfileirados });
      emailsEnviados = resumo.enviados;
    } catch (e) {
      console.error("Dispatcher de email falhou (será reprocessado pelo cron):", e);
    }
  }

  return NextResponse.json({
    manutencaoId: manutCriada.id,
    reservasCanceladas,
    emailsEnfileirados,
    emailsEnviados,
  });
}

// ----------------------------------------------------------------------
// DELETE — encerrar a manutenção ativa
// ----------------------------------------------------------------------
export async function DELETE(req: Request) {
  let corpo: CorpoDelete;
  try {
    corpo = (await req.json()) as CorpoDelete;
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }
  const { veiculoId } = corpo;
  if (typeof veiculoId !== "string" || !veiculoId) {
    return NextResponse.json({ erro: "veiculoId obrigatório." }, { status: 400 });
  }

  const aut = await autorizar();
  if (!aut.ok) {
    return NextResponse.json({ erro: aut.mensagem }, { status: aut.status });
  }
  const ator = aut.ator;
  const admin = criarSupabaseAdmin();

  const { data: veiculo } = await admin
    .from("veiculos")
    .select("id, secretaria_id, placa, modelo, marca")
    .eq("id", veiculoId)
    .maybeSingle();
  if (!veiculo) {
    return NextResponse.json({ erro: "Veículo não encontrado." }, { status: 404 });
  }
  if (ator.perfil === "gestor" && veiculo.secretaria_id !== ator.secretariaId) {
    return NextResponse.json(
      { erro: "Gestor só pode gerenciar veículos da própria secretaria." },
      { status: 403 },
    );
  }

  const { data: ativa } = await admin
    .from("manutencoes")
    .select("id")
    .eq("veiculo_id", veiculoId)
    .is("encerrado_em", null)
    .maybeSingle();
  if (!ativa) {
    return NextResponse.json(
      { erro: "Não há manutenção ativa para este veículo." },
      { status: 404 },
    );
  }

  const agora = new Date().toISOString();
  const { error: errEnc } = await admin
    .from("manutencoes")
    .update({ encerrado_em: agora })
    .eq("id", ativa.id);
  if (errEnc) {
    return NextResponse.json(
      { erro: `Falha ao encerrar manutenção: ${errEnc.message}` },
      { status: 500 },
    );
  }

  const { error: errVeic } = await admin
    .from("veiculos")
    .update({ status: "disponivel" })
    .eq("id", veiculoId);
  if (errVeic) {
    return NextResponse.json(
      { erro: `Falha ao atualizar veículo: ${errVeic.message}` },
      { status: 500 },
    );
  }

  // Notificação interna (sino): avisa TODOS os usuários que o veículo voltou
  // da manutenção e já pode ser reservado.
  const nomeVeic =
    [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ").trim() ||
    veiculo.modelo;
  const { data: todos } = await admin.from("profiles").select("id");
  await inserirNotificacoes(
    admin,
    (todos ?? []).map((p) => ({
      destinatarioId: p.id,
      tipo: "veiculo_liberado" as const,
      titulo: "Veículo liberado da manutenção",
      mensagem: `${veiculo.placa} · ${nomeVeic} voltou da manutenção e já está disponível para reservas.`,
      veiculoId: veiculo.id,
    })),
    ator.profileId,
  );

  return NextResponse.json({ ok: true });
}
