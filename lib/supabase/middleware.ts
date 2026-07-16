import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

/** Rotas que funcionam sem sessão (o resto vai para /login). */
const ROTAS_PUBLICAS = ["/login", "/esqueci-senha"];

/**
 * Renova a sessão do Supabase a cada requisição e exige login: sem sessão,
 * qualquer rota protegida redireciona para /login.
 *
 * Públicas: /login, /esqueci-senha, /auth/* e /api/*.
 *   - /auth/confirm recebe o link de recuperação e é quem CRIA a sessão —
 *     se exigisse sessão, o link nunca funcionaria;
 *   - /api/* faz a própria autorização e responde JSON, então não pode ser
 *     redirecionada.
 * /nova-senha fica PROTEGIDA de propósito: só se chega nela depois que o
 * /auth/confirm validou o token e abriu a sessão.
 */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Importante: chamar getUser() — força a renovação do token se necessário.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Exige login: sem sessão, redireciona rotas protegidas para /login.
  const path = request.nextUrl.pathname;
  const ehPublico =
    ROTAS_PUBLICAS.includes(path) ||
    path.startsWith("/auth/") ||
    path.startsWith("/api");
  if (!user && !ehPublico) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return response;
}
