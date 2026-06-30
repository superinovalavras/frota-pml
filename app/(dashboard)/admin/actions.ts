"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { criarSupabaseAdmin, criarSupabaseServer } from "@/lib/supabase/server";
import { usuarioToRow } from "@/lib/data/mappers";
import type { Database, PerfilDb } from "@/lib/supabase/types";
import type { Usuario } from "@/lib/mock/types";

/** Senha inicial de contas criadas pelo Master (a pessoa troca depois). */
const SENHA_PADRAO = "Frota@Lavras2026";

export type ResultadoUsuario =
  | { ok: true; senhaInicial?: string }
  | { ok: false; erro: string };

type Admin = SupabaseClient<Database>;

async function exigirMaster(): Promise<
  { ok: true; admin: Admin; atorProfileId: string | null }
  | { ok: false; erro: string }
> {
  const supa = await criarSupabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Não autenticado." };
  const admin = criarSupabaseAdmin();
  const { data: ator } = await admin
    .from("profiles")
    .select("id, perfil")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (ator?.perfil !== "master") {
    return { ok: false, erro: "Apenas o Master pode gerenciar usuários." };
  }
  return { ok: true, admin, atorProfileId: ator.id };
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

/**
 * Promove/rebaixa um usuário a Master (nível de acesso). Só mexe na coluna
 * `perfil` — a função organizacional (`funcao_id`) é preservada: Master é um
 * nível de acesso por cima do cargo. Ao rebaixar, `perfil` volta a refletir o
 * nível de acesso da função atual da pessoa.
 *
 * Pode haver vários masters. Regra de segurança: o master logado NÃO pode
 * rebaixar a si mesmo (evita trancar-se fora do sistema).
 */
export async function definirMaster(
  usuarioId: string,
  ehMaster: boolean,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const aut = await exigirMaster();
  if (!aut.ok) return aut;
  const { admin, atorProfileId } = aut;

  if (!ehMaster && usuarioId === atorProfileId) {
    return {
      ok: false,
      erro: "Você não pode remover o seu próprio acesso Master.",
    };
  }

  const { data: alvo, error: errBusca } = await admin
    .from("profiles")
    .select("id, perfil, funcao_id")
    .eq("id", usuarioId)
    .maybeSingle();
  if (errBusca || !alvo) {
    return { ok: false, erro: "Usuário não encontrado." };
  }

  let novoPerfil: PerfilDb;
  if (ehMaster) {
    novoPerfil = "master";
  } else {
    // Rebaixar: perfil volta ao nível de acesso da função atual da pessoa.
    const { data: funcao } = await admin
      .from("funcoes")
      .select("nivel_acesso")
      .eq("id", alvo.funcao_id)
      .maybeSingle();
    // Se a própria função já for de nível master (a função "Master"), cai para
    // gestor para que o rebaixamento tenha efeito.
    const nivel = (funcao?.nivel_acesso ?? "servidor") as PerfilDb;
    novoPerfil = nivel === "master" ? "gestor" : nivel;
  }

  const { error: errUp } = await admin
    .from("profiles")
    .update({ perfil: novoPerfil })
    .eq("id", usuarioId);
  if (errUp) {
    return { ok: false, erro: `Falha ao atualizar acesso: ${errUp.message}` };
  }

  return { ok: true };
}
