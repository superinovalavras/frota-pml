"use server";

import { createClient } from "@supabase/supabase-js";
import { criarSupabaseAdmin, criarSupabaseServer } from "@/lib/supabase/server";
import type { CategoriaCNH } from "@/lib/mock/types";
import type { Database } from "@/lib/supabase/types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/**
 * Atualização do **próprio** perfil pelo usuário logado. Restringe-se às
 * colunas que o usuário pode mudar sozinho sem virar Master:
 *   telefone, foto_url, cnh_categoria, cnh_numero, cnh_validade.
 *
 * Nome, cargo, função, secretaria, CPF, MASP, email, etc. seguem só
 * editáveis pelo Master via /admin (a RLS 0003 endurece isso no banco).
 */

const CATEGORIAS_CNH_VALIDAS: CategoriaCNH[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "AB",
  "AC",
  "AD",
  "AE",
];

export interface EntradaMeuPerfil {
  telefone?: string;
  fotoUrl?: string | null;
  cnhCategoria?: string;
  cnhNumero?: string;
  cnhValidade?: string;
}

export type ResultadoMeuPerfil =
  | { ok: true }
  | { ok: false; erro: string };

export async function atualizarMeuPerfil(
  entrada: EntradaMeuPerfil,
): Promise<ResultadoMeuPerfil> {
  const supa = await criarSupabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) {
    return { ok: false, erro: "Não autenticado." };
  }

  const admin = criarSupabaseAdmin();
  const { data: perfil, error: errBusca } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (errBusca || !perfil) {
    return { ok: false, erro: "Perfil não encontrado para esta conta." };
  }

  // Sanitização / validação leve. Strings vazias viram null para limpar campos.
  const update: ProfileUpdate = {};

  if (entrada.telefone !== undefined) {
    update.telefone = entrada.telefone.trim();
  }

  if (entrada.fotoUrl !== undefined) {
    update.foto_url = entrada.fotoUrl ?? null;
  }

  // CNH: tratada como um bloco — se a categoria for limpa, limpa número e validade
  // para manter consistência. Se a categoria existe, valida.
  let mudouCnh = false;
  let categoria: string | null | undefined = undefined;
  if (entrada.cnhCategoria !== undefined) {
    const c = entrada.cnhCategoria.trim();
    if (c === "") {
      categoria = null;
    } else if (
      !CATEGORIAS_CNH_VALIDAS.includes(c as CategoriaCNH)
    ) {
      return { ok: false, erro: "Categoria de CNH inválida." };
    } else {
      categoria = c;
    }
    update.cnh_categoria = categoria;
    mudouCnh = true;
  }
  if (entrada.cnhNumero !== undefined) {
    update.cnh_numero = entrada.cnhNumero.trim() || null;
    mudouCnh = true;
  }
  if (entrada.cnhValidade !== undefined) {
    const v = entrada.cnhValidade.trim();
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return { ok: false, erro: "Validade inválida (use AAAA-MM-DD)." };
    }
    update.cnh_validade = v || null;
    mudouCnh = true;
  }

  // Se o usuário zerou a categoria, limpa também número e validade para
  // não deixar dados órfãos.
  if (mudouCnh && categoria === null) {
    update.cnh_numero = null;
    update.cnh_validade = null;
  }

  if (Object.keys(update).length === 0) {
    return { ok: true };
  }

  const { error: errUpd } = await admin
    .from("profiles")
    .update(update)
    .eq("id", perfil.id);
  if (errUpd) {
    return { ok: false, erro: `Falha ao atualizar perfil: ${errUpd.message}` };
  }
  return { ok: true };
}

/**
 * Troca a senha do PRÓPRIO usuário logado. Confere a senha atual antes
 * (login descartável, sem mexer na sessão) e exige mínimo de 8 caracteres.
 */
export async function trocarMinhaSenha(
  senhaAtual: string,
  novaSenha: string,
): Promise<ResultadoMeuPerfil> {
  const supa = await criarSupabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) {
    return { ok: false, erro: "Não autenticado." };
  }
  const email = auth.user.email;
  if (!email) {
    return { ok: false, erro: "Esta conta não tem e-mail para validar a senha." };
  }
  if (!novaSenha || novaSenha.length < 4) {
    return { ok: false, erro: "A nova senha precisa ter ao menos 4 caracteres." };
  }
  if (novaSenha === senhaAtual) {
    return { ok: false, erro: "A nova senha deve ser diferente da atual." };
  }

  // Confere a senha atual com um cliente descartável (persistSession:false não
  // toca nos cookies da sessão real).
  const verificador = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { error: errVer } = await verificador.auth.signInWithPassword({
    email,
    password: senhaAtual,
  });
  if (errVer) {
    return { ok: false, erro: "Senha atual incorreta." };
  }

  const { error: errUpdSenha } = await supa.auth.updateUser({
    password: novaSenha,
  });
  if (errUpdSenha) {
    return { ok: false, erro: `Falha ao trocar a senha: ${errUpdSenha.message}` };
  }
  return { ok: true };
}
