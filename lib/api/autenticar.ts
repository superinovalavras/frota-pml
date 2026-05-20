/**
 * Helpers de autenticação/autorização para Route Handlers.
 *
 * `obterAtor` resolve a sessão do Supabase em um perfil completo do app
 * (profile da tabela `profiles`). Usado pelas rotas server que enfileiram
 * eventos ou fazem operações privilegiadas.
 */
import "server-only";
import { criarSupabaseServer, criarSupabaseAdmin } from "@/lib/supabase/server";

export interface Ator {
  profileId: string;
  authUserId: string;
  perfil: "master" | "gestor" | "servidor" | "motorista";
  hierarquia: number;
  secretariaId: string;
  superintendenciaId: string | null;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
}

export type ResultadoAtor =
  | { ok: true; ator: Ator }
  | { ok: false; status: number; mensagem: string };

export async function obterAtor(): Promise<ResultadoAtor> {
  const supa = await criarSupabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) {
    return { ok: false, status: 401, mensagem: "Não autenticado." };
  }
  const admin = criarSupabaseAdmin();
  const { data: perfil, error } = await admin
    .from("profiles")
    .select(
      "id, nome, cargo, email, telefone, perfil, hierarquia, secretaria_id, superintendencia_id",
    )
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (error || !perfil) {
    return { ok: false, status: 403, mensagem: "Perfil não encontrado." };
  }
  return {
    ok: true,
    ator: {
      profileId: perfil.id,
      authUserId: auth.user.id,
      perfil: perfil.perfil,
      hierarquia: perfil.hierarquia,
      secretariaId: perfil.secretaria_id,
      superintendenciaId: perfil.superintendencia_id,
      nome: perfil.nome ?? "",
      cargo: perfil.cargo ?? "",
      email: perfil.email ?? "",
      telefone: perfil.telefone ?? "",
    },
  };
}

export function ehGestorOuMaster(ator: Ator): boolean {
  return ator.perfil === "master" || ator.perfil === "gestor";
}
