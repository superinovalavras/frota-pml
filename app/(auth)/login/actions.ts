"use server";

import { criarSupabaseServer } from "@/lib/supabase/server";
import { resolverEmailDoIdentificador } from "@/lib/auth/identificador";

export type EstadoLogin = { erro: string } | { ok: true } | null;

/** Login: aceita usuário, e-mail, CPF ou MASP + senha. */
export async function entrar(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const identificador = String(formData.get("identificador") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  if (!identificador || !senha) {
    return { erro: "Informe o identificador e a senha." };
  }

  let email: string;
  try {
    const r = await resolverEmailDoIdentificador(identificador);
    if (!r.email) {
      return {
        erro:
          r.tipo === "cpf_masp"
            ? "CPF/MASP não encontrado."
            : "Usuário não encontrado. Tente o e-mail completo.",
      };
    }
    email = r.email;
  } catch {
    return {
      erro: "Não foi possível validar o acesso. Tente pelo e-mail completo.",
    };
  }

  const supabase = await criarSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) return { erro: "Identificador ou senha inválidos." };

  // Não usamos redirect() aqui de propósito: o redirect de server action faz
  // navegação "suave" (sem recarregar), e os providers do layout raiz — que
  // montaram ANTES do login, quando a RLS devolvia tudo vazio — ficariam com
  // os dados vazios até um F5. O client faz `window.location.assign`, que
  // recarrega a página inteira já com a sessão.
  return { ok: true };
}
