/**
 * /api/email/dispatch
 *
 * Endpoint que processa a fila `email_outbox` — pega pendentes, renderiza
 * e envia via Resend. Disparado pelo Vercel Cron (ver vercel.json) como
 * rede de segurança; o caminho feliz é o envio inline feito pela rota
 * que enfileira (ex.: /api/manutencao).
 *
 * Autorização:
 *   - Vercel injeta `Authorization: Bearer ${CRON_SECRET}`; exigimos esse
 *     header sempre que `CRON_SECRET` estiver definido.
 *   - Em produção, SEM `CRON_SECRET` a rota é recusada (não confiamos no
 *     header Host, que é forjável). Em desenvolvimento (`NODE_ENV !==
 *     "production"`) liberamos para facilitar testes locais.
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
  // Sem segredo: só em dev. Em produção, recusa (não dá para confiar no Host).
  return process.env.NODE_ENV !== "production";
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
