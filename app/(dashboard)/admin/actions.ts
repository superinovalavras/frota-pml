"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { criarSupabaseAdmin, criarSupabaseServer } from "@/lib/supabase/server";
import { usuarioToRow } from "@/lib/data/mappers";
import type { Database } from "@/lib/supabase/types";
import type { Usuario } from "@/lib/mock/types";

/** Senha inicial de contas criadas pelo Master (a pessoa troca depois). */
const SENHA_PADRAO = "Frota@Lavras2026";

export type ResultadoUsuario =
  | { ok: true; senhaInicial?: string }
  | { ok: false; erro: string };

type Admin = SupabaseClient<Database>;

async function exigirMaster(): Promise<
  { ok: true; admin: Admin } | { ok: false; erro: string }
> {
  const supa = await criarSupabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Não autenticado." };
  const admin = criarSupabaseAdmin();
  const { data: ator } = await admin
    .from("profiles")
    .select("perfil")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (ator?.perfil !== "master") {
    return { ok: false, erro: "Apenas o Master pode gerenciar usuários." };
  }
  return { ok: true, admin };
}

async function acharAuthPorEmail(
  admin: Admin,
  email: string,
): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data) return null;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (data.users.length < 200) return null;
  }
}

/**
 * Cria/edita um usuário (perfil) pelo Master, gerenciando a CONTA DE LOGIN:
 *   - usuário novo com e-mail → cria conta no Supabase Auth (senha padrão) e
 *     grava auth_user_id (sem isso a pessoa não consegue logar);
 *   - e-mail alterado → sincroniza no Auth (senão o login continua pedindo o
 *     e-mail antigo).
 */
export async function salvarUsuarioAdmin(
  usuario: Usuario,
): Promise<ResultadoUsuario> {
  const aut = await exigirMaster();
  if (!aut.ok) return aut;
  const admin = aut.admin;

  const { data: existente } = await admin
    .from("profiles")
    .select("id, auth_user_id, email")
    .eq("id", usuario.id)
    .maybeSingle();

  let authUserId: string | null = existente?.auth_user_id ?? null;
  let senhaInicial: string | undefined;
  const email = (usuario.email ?? "").trim().toLowerCase();

  if (email) {
    if (!authUserId) {
      const achado = await acharAuthPorEmail(admin, email);
      if (achado) {
        authUserId = achado;
      } else {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: SENHA_PADRAO,
          email_confirm: true,
          user_metadata: { nome: usuario.nome },
        });
        if (error) {
          return { ok: false, erro: `Falha ao criar o login: ${error.message}` };
        }
        authUserId = data.user.id;
        senhaInicial = SENHA_PADRAO;
      }
    } else if ((existente?.email ?? "").toLowerCase() !== email) {
      const { error } = await admin.auth.admin.updateUserById(authUserId, {
        email,
        email_confirm: true,
      });
      if (error) {
        return {
          ok: false,
          erro: `Falha ao atualizar o e-mail de login: ${error.message}`,
        };
      }
    }
  }

  const row = { ...usuarioToRow(usuario), auth_user_id: authUserId };
  const { error: errUp } = await admin.from("profiles").upsert(row);
  if (errUp) {
    return { ok: false, erro: `Falha ao salvar usuário: ${errUp.message}` };
  }

  return { ok: true, senhaInicial };
}
