import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { criarSupabaseServer } from "@/lib/supabase/server";

/**
 * Destino do link enviado por e-mail (recuperação de senha).
 *
 * O template do e-mail no Supabase manda `token_hash` + `type` para cá; aqui a
 * gente troca esse token por uma sessão de verdade e leva a pessoa para
 * /nova-senha. É por isso que a rota precisa ser pública (ver
 * lib/supabase/middleware.ts): ela é justamente quem CRIA a sessão.
 *
 * Template esperado (Supabase → Auth → Email Templates → Reset Password):
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nova-senha
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // `next` vem da URL: só aceita caminho interno ("/algo"), nunca "//host"
  // nem URL absoluta — senão o link do e-mail viraria um redirect aberto.
  const next = searchParams.get("next");
  const destinoOk =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/nova-senha";

  const destino = request.nextUrl.clone();
  destino.search = "";

  if (token_hash && type) {
    const supabase = await criarSupabaseServer();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      destino.pathname = destinoOk;
      return NextResponse.redirect(destino);
    }
  }

  // Link inválido, já usado ou expirado (valem 1 hora e um uso só).
  destino.pathname = "/esqueci-senha";
  destino.searchParams.set("erro", "link");
  return NextResponse.redirect(destino);
}
