"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Acesso à tabela `configuracoes` (chave/valor). Hoje guarda a URL da logo
 * personalizada. As funções lançam em caso de erro real; quem chama decide
 * se faz fallback (ver branding-context, que cai para o localStorage enquanto
 * a migration 0002 não estiver aplicada).
 */

export async function lerConfig<T = unknown>(chave: string): Promise<T | null> {
  const { data, error } = await supabaseBrowser()
    .from("configuracoes")
    .select("valor")
    .eq("chave", chave)
    .maybeSingle();
  if (error) throw new Error(`lerConfig(${chave}): ${error.message}`);
  return (data?.valor ?? null) as T | null;
}

export async function gravarConfig(chave: string, valor: unknown): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("configuracoes")
    .upsert({ chave, valor, atualizado_em: new Date().toISOString() });
  if (error) throw new Error(`gravarConfig(${chave}): ${error.message}`);
}

const CHAVE_LOGO = "branding.logo_url";

export async function lerLogoUrl(): Promise<string | null> {
  const v = await lerConfig<string>(CHAVE_LOGO);
  return typeof v === "string" && v ? v : null;
}

export async function gravarLogoUrl(url: string | null): Promise<void> {
  await gravarConfig(CHAVE_LOGO, url);
}
