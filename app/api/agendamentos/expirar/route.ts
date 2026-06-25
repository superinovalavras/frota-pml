/**
 * /api/agendamentos/expirar  (GET)
 *
 * Fecha automaticamente as reservas cujo horário JÁ PASSOU e que ninguém
 * encerrou:
 *   - confirmada / em andamento (a viagem ocorreu) → "concluido";
 *   - pendente (nunca aprovada) → "cancelado".
 *
 * Disparado pelo Vercel Cron (ver vercel.json). É idempotente: rodar de novo
 * não muda nada além das que venceram desde a última passada.
 *
 * Autorização: igual ao /api/email/dispatch — exige `CRON_SECRET` se definido;
 * em dev (NODE_ENV !== "production") libera para teste local.
 */
import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    return req.headers.get("authorization") === `Bearer ${secret}`;
  }
  return process.env.NODE_ENV !== "production";
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const agora = new Date().toISOString();
  const admin = criarSupabaseAdmin();
  try {
    // Confirmadas / em andamento que já terminaram → concluídas.
    // (O service_role passa direto pela trigger de guarda de status.)
    const { data: concluidas, error: errConcl } = await admin
      .from("agendamentos")
      .update({ status: "concluido" })
      .in("status", ["confirmado", "em_andamento"])
      .lt("fim", agora)
      .select("id");
    if (errConcl) throw errConcl;

    // Pendentes que já terminaram (nunca aprovadas) → canceladas.
    const { data: canceladas, error: errCanc } = await admin
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("status", "pendente")
      .lt("fim", agora)
      .select("id");
    if (errCanc) throw errCanc;

    return NextResponse.json({
      ok: true,
      concluidas: concluidas?.length ?? 0,
      canceladas: canceladas?.length ?? 0,
      em: agora,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : "erro" },
      { status: 500 },
    );
  }
}
