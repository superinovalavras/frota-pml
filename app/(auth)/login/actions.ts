"use server";

import { redirect } from "next/navigation";
import { criarSupabaseServer, criarSupabaseAdmin } from "@/lib/supabase/server";

export type EstadoLogin = { erro: string } | null;

/**
 * Login: aceita e-mail, CPF ou MASP + senha.
 * - Com "@": trata como e-mail.
 * - Sem "@": só dígitos → procura em profiles.cpf / profiles.masp para
 *   descobrir o e-mail (consulta admin, ignora RLS).
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
    const digitos = identificador.replace(/\D/g, "");
    if (!digitos) return { erro: "Informe um e-mail válido, ou um CPF/MASP." };
    try {
      const admin = criarSupabaseAdmin();
      const { data, error } = await admin
        .from("profiles")
        .select("email")
        .or(`cpf.eq.${digitos},masp.eq.${digitos}`)
        .neq("email", "")
        .limit(1)
        .maybeSingle();
      if (error || !data?.email) return { erro: "CPF/MASP não encontrado." };
      email = data.email;
    } catch {
      return { erro: "Não foi possível validar o CPF/MASP. Tente pelo e-mail." };
    }
  }

  const supabase = await criarSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) return { erro: "Identificador ou senha inválidos." };

  redirect("/agenda");
}
