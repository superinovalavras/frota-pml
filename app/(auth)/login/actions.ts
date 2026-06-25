"use server";

import { criarSupabaseServer, criarSupabaseAdmin } from "@/lib/supabase/server";

export type EstadoLogin = { erro: string } | { ok: true } | null;

/**
 * Login: aceita usuário, e-mail, CPF ou MASP + senha.
 * - Com "@": trata como e-mail completo.
 * - Sem "@", só dígitos → procura em profiles.cpf / profiles.masp.
 * - Sem "@", com letras → trata como "usuário" (a parte antes do @) e procura
 *   o e-mail que começa com "{usuário}@".
 * As consultas usam o cliente admin (ignora RLS) só para descobrir o e-mail.
 */
export async function entrar(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const identificador = String(formData.get("identificador") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  if (!identificador || !senha) {
    return { erro: "Informe o identificador e a senha." };
  }

  let email = identificador;
  if (!identificador.includes("@")) {
    const ehSoDigitos = /^\d+$/.test(identificador);
    try {
      const admin = criarSupabaseAdmin();
      if (ehSoDigitos) {
        // CPF ou MASP (só dígitos).
        const { data, error } = await admin
          .from("profiles")
          .select("email")
          .or(`cpf.eq.${identificador},masp.eq.${identificador}`)
          .neq("email", "")
          .limit(1)
          .maybeSingle();
        if (error || !data?.email) return { erro: "CPF/MASP não encontrado." };
        email = data.email;
      } else {
        // "Usuário" = parte antes do @ (ex.: "joao.silva"). Escapa curingas
        // do LIKE para casar a parte local exatamente.
        const esc = identificador.replace(/[%_\\]/g, "\\$&");
        const { data, error } = await admin
          .from("profiles")
          .select("email")
          .ilike("email", `${esc}@%`)
          .neq("email", "")
          .limit(1)
          .maybeSingle();
        if (error || !data?.email) {
          return { erro: "Usuário não encontrado. Tente o e-mail completo." };
        }
        email = data.email;
      }
    } catch {
      return {
        erro: "Não foi possível validar o acesso. Tente pelo e-mail completo.",
      };
    }
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
