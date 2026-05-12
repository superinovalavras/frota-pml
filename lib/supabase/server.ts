import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Cliente Supabase para Server Components, Route Handlers e Server Actions.
 * Lê/escreve a sessão do usuário nos cookies da requisição.
 *
 * Em Server Components a escrita de cookies é ignorada (não dá erro) —
 * a renovação de sessão acontece no middleware.
 */
export async function criarSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Chamado de um Server Component — ok ignorar; o middleware renova.
          }
        },
      },
    },
  );
}

/**
 * Cliente "admin" com a chave service_role — IGNORA a RLS.
 * Usar SOMENTE no servidor, em operações controladas (criação de usuários
 * pelo Master, jobs, seed). Nunca expor ao navegador.
 */
export function criarSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente — defina em .env.local (nunca commitar).",
    );
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
