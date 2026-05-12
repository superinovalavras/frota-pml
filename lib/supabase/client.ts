"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Cliente Supabase para uso em Client Components (navegador).
 * Usa a chave publishable — todo o controle de acesso fica na RLS do banco.
 *
 * Singleton: o mesmo cliente é reutilizado em toda a aplicação no browser.
 */
let _client: SupabaseClient<Database> | undefined;

export function supabaseBrowser(): SupabaseClient<Database> {
  if (!_client) {
    _client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}
