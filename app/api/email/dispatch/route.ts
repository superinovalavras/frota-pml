/**
 * /api/email/dispatch
 *
 * Endpoint que processa a fila `email_outbox` — pega pendentes, renderiza
 * e envia via Resend. Disparado pelo Vercel Cron (ver vercel.json) como
 * rede de segurança; o caminho feliz é o envio inline feito pela rota
 * que enfileira (ex.: /api/manutencao).
 *
 * Autorização:
 *   - Em produção, Vercel injeta `Authorization: Bearer ${CRON_SECRET}`
 *     se a env var existir; exigimos esse header.
 *   - Sem CRON_SECRET configurado a rota só aceita chamadas localhost
 *     (útil em dev). Em produção, sempre configure CRON_SECRET.
 */
import { NextResponse } from "next/server";
import { processarFila } from "@/lib/email/dispatcher";

export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization");
    return header === `Bearer ${secret}`;
  }
  // Sem segredo configurado — permite só de localhost (dev).
  const host = req.headers.get("host") ?? "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  try {
    const resumo = await processarFila();
    return NextResponse.json({ ok: true, ...resumo, em: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : "erro" },
      { status: 500 },
    );
  }
}
