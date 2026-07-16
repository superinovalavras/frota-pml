"use server";

import { headers } from "next/headers";
import { criarSupabaseServer } from "@/lib/supabase/server";
import { resolverEmailDoIdentificador } from "@/lib/auth/identificador";
import { RECUPERACAO_SENHA_EMAIL_ATIVA } from "@/lib/flags";

export type EstadoRecuperacao =
  | { erro: string }
  | { ok: true; emailMascarado: string }
  | null;

/**
 * Esconde o e-mail, mostrando só o bastante para a pessoa saber qual caixa
 * abrir: "b****@lavras.mg.gov.br".
 */
function mascararEmail(email: string): string {
  const arroba = email.lastIndexOf("@");
  if (arroba < 1) return email;
  const local = email.slice(0, arroba);
  const dominio = email.slice(arroba);
  return `${local[0]}${"*".repeat(Math.max(3, local.length - 1))}${dominio}`;
}

/**
 * "Esqueci minha senha": recebe usuário/CPF/MASP/e-mail e dispara o link de
 * recuperação para o e-mail CADASTRADO da pessoa.
 *
 * O identificador é só a chave de busca — quem autoriza a troca é a posse da
 * caixa de e-mail. Por isso o CPF sozinho nunca redefine nada: ele apenas
 * decide para qual endereço o link é enviado.
 *
 * O link cai em /auth/confirm (ver app/auth/confirm/route.ts), que troca o
 * token por sessão e leva a pessoa até /nova-senha.
 */
export async function enviarLinkRecuperacao(
  _prev: EstadoRecuperacao,
  formData: FormData,
): Promise<EstadoRecuperacao> {
  // Sem SMTP o Supabase responde "ok" e não entrega nada: melhor dizer a
  // verdade do que mostrar um "link enviado" que nunca chega.
  if (!RECUPERACAO_SENHA_EMAIL_ATIVA) {
    return {
      erro: "A recuperação por e-mail ainda não está ativa. Peça a um Master para resetar sua senha.",
    };
  }

  const identificador = String(formData.get("identificador") ?? "").trim();
  if (!identificador) {
    return { erro: "Informe seu usuário, CPF, MASP ou e-mail." };
  }

  let email: string | null;
  try {
    email = (await resolverEmailDoIdentificador(identificador)).email;
  } catch {
    return { erro: "Não foi possível processar agora. Tente novamente." };
  }
  if (!email) {
    return { erro: "Não encontramos esse usuário, CPF, MASP ou e-mail." };
  }

  const origem =
    (await headers()).get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://frota-pml.vercel.app";

  const supabase = await criarSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/auth/confirm?next=/nova-senha`,
  });
  if (error) {
    return {
      erro: "Não foi possível enviar o e-mail agora. Tente em alguns minutos.",
    };
  }

  return { ok: true, emailMascarado: mascararEmail(email) };
}
