import { criarSupabaseAdmin } from "@/lib/supabase/server";

/** Como a pessoa se identificou: muda só a mensagem de erro do chamador. */
export type TipoIdentificador = "email" | "cpf_masp" | "usuario";

export type IdentificadorResolvido = {
  tipo: TipoIdentificador;
  /** E-mail de login, ou null se não encontrado. */
  email: string | null;
};

/**
 * Traduz o que a pessoa digitou (usuário, e-mail, CPF ou MASP) no e-mail de
 * login cadastrado. Usado pelo login e pelo "esqueci minha senha".
 *
 *   - com "@"            → é o próprio e-mail;
 *   - só dígitos         → procura em profiles.cpf / profiles.masp;
 *   - com letras, sem "@" → é o "usuário" (parte antes do @) e procura o
 *     e-mail que começa com "{usuário}@".
 *
 * Usa o cliente admin (ignora RLS) porque a consulta acontece ANTES de haver
 * sessão. Devolve só o e-mail — nenhum outro dado do perfil sai daqui.
 */
export async function resolverEmailDoIdentificador(
  identificador: string,
): Promise<IdentificadorResolvido> {
  const id = identificador.trim();
  if (!id) return { tipo: "usuario", email: null };

  if (id.includes("@")) return { tipo: "email", email: id.toLowerCase() };

  const admin = criarSupabaseAdmin();

  if (/^\d+$/.test(id)) {
    const { data } = await admin
      .from("profiles")
      .select("email")
      .or(`cpf.eq.${id},masp.eq.${id}`)
      .neq("email", "")
      .limit(1)
      .maybeSingle();
    return { tipo: "cpf_masp", email: data?.email ?? null };
  }

  // Escapa curingas do LIKE para casar a parte local exatamente.
  const esc = id.replace(/[%_\\]/g, "\\$&");
  const { data } = await admin
    .from("profiles")
    .select("email")
    .ilike("email", `${esc}@%`)
    .neq("email", "")
    .limit(1)
    .maybeSingle();
  return { tipo: "usuario", email: data?.email ?? null };
}
