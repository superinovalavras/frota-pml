import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Renova a sessão do Supabase a cada requisição e exige login: sem sessão,
 * qualquer rota protegida redireciona para /login. Rotas públicas: /login e
 * /api/* (as rotas de API fazem a própria autorização e respondem em JSON,
 * então não devem ser redirecionadas).
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
  const ehPublico = path === "/login" || path.startsWith("/api");
  if (!user && !ehPublico) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return response;
}
