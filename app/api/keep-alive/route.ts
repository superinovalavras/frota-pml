import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Endpoint leve para manter o projeto Supabase "acordado".
 * No plano gratuito o projeto pausa após ~7 dias sem requisições — um cron
 * diário (ver vercel.json) chama esta rota e isso reseta o contador.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = criarSupabaseAdmin();
    const { error } = await supabase
      .from("secretarias")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, em: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : "erro" },
      { status: 500 },
    );
  }
}
