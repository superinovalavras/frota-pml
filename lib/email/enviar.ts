/**
 * Envio de email via Resend (https://resend.com).
 *
 * Usa a API HTTP diretamente — sem SDK — porque o que precisamos é
 * trivial e qualquer dependência a mais pesa no bundle/serverless.
 *
 * Variáveis de ambiente necessárias:
 *   RESEND_API_KEY   — secret, gerado no painel do Resend
 *   EMAIL_REMETENTE  — ex.: "Frota PML <frota@dominio.gov.br>". O domínio
 *                      precisa estar verificado no Resend. Para testes,
 *                      "onboarding@resend.dev" funciona (mas Resend exige
 *                      que o destinatário seja o mesmo email cadastrado
 *                      como dono da conta).
 */
import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface ParametrosEnvio {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Opcional. Se ausente, usa EMAIL_REMETENTE. */
  from?: string;
  /** Cabeçalho Reply-To. */
  replyTo?: string;
}

export interface ResultadoEnvio {
  ok: true;
  id: string;
}

export interface FalhaEnvio {
  ok: false;
  erro: string;
  status?: number;
}

export async function enviarEmail(
  p: ParametrosEnvio,
): Promise<ResultadoEnvio | FalhaEnvio> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, erro: "RESEND_API_KEY ausente." };
  }
  const from = p.from ?? process.env.EMAIL_REMETENTE;
  if (!from) {
    return { ok: false, erro: "EMAIL_REMETENTE ausente." };
  }

  let resp: Response;
  try {
    resp = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: p.to,
        subject: p.subject,
        html: p.html,
        text: p.text,
        ...(p.replyTo ? { reply_to: p.replyTo } : {}),
      }),
    });
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "fetch falhou" };
  }

  let body: unknown = null;
  try {
    body = await resp.json();
  } catch {
    // sem body válido — ignora
  }

  if (!resp.ok) {
    const msg =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${resp.status}`;
    return { ok: false, erro: msg, status: resp.status };
  }

  const id =
    body && typeof body === "object" && "id" in body
      ? String((body as { id: unknown }).id)
      : "";
  return { ok: true, id };
}
