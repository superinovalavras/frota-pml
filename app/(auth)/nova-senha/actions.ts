"use server";

import { criarSupabaseServer } from "@/lib/supabase/server";

export type ResultadoNovaSenha = { ok: true } | { ok: false; erro: string };

/**
 * Grava a senha nova de quem chegou pelo link de recuperação.
 *
 * Não pede a senha antiga de propósito: quem chegou aqui já provou identidade
 * ao abrir o link enviado à própria caixa de e-mail (/auth/confirm criou a
 * sessão). Sem sessão, nada acontece.
 */
export async function definirNovaSenha(
  nova: string,
): Promise<ResultadoNovaSenha> {
  if (nova.length < 6) {
    return { ok: false, erro: "A senha precisa ter ao menos 6 caracteres." };
  }

  const supabase = await criarSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return {
      ok: false,
      erro: "Seu link expirou ou já foi usado. Peça um novo em “Esqueci minha senha”.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) {
    return { ok: false, erro: `Não foi possível salvar: ${error.message}` };
  }
  return { ok: true };
}
