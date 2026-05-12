import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Renova a sessão do Supabase a cada requisição e devolve a resposta com os
 * cookies atualizados. NÃO bloqueia rotas — a app continua acessível em
 * "modo demonstração" sem sessão. (Quando o login estiver validado, dá para
 * adicionar aqui um redirect para /login quando não houver usuário.)
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
  await supabase.auth.getUser();

  return response;
}
