/**
 * Camada de acesso a dados — fala com o Supabase a partir do navegador
 * (Client Components / contextos). Funções pequenas, uma por operação.
 *
 * Convenção: lançam em caso de erro. Quem chama decide se mostra toast,
 * faz rollback do estado otimista, etc.
 */
"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type {
  Agendamento,
  Funcao,
  Secretaria,
  Superintendencia,
  Usuario,
  Veiculo,
} from "@/lib/mock/types";
import {
  agendamentoFromRow,
  agendamentoToRow,
  funcaoFromRow,
  funcaoToRow,
  secretariaFromRow,
  secretariaToRow,
  superintendenciaFromRow,
  superintendenciaToRow,
  usuarioFromRow,
  usuarioToRow,
  veiculoFromRow,
  veiculoToRow,
} from "./mappers";

function check<T>(data: T | null, error: { message: string } | null, ctx: string): T {
  if (error) throw new Error(`${ctx}: ${error.message}`);
  return data as T;
}

// ---------------------------------------------------------------------
// Secretarias
// ---------------------------------------------------------------------
export async function listarSecretarias(): Promise<Secretaria[]> {
  const { data, error } = await supabaseBrowser()
    .from("secretarias")
    .select("*")
    .order("nome");
  return check(data, error, "listarSecretarias").map(secretariaFromRow);
}
export async function upsertSecretaria(s: Secretaria): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("secretarias")
    .upsert(secretariaToRow(s));
  if (error) throw new Error(`upsertSecretaria: ${error.message}`);
}
export async function removerSecretaria(id: string): Promise<void> {
  const { error } = await supabaseBrowser().from("secretarias").delete().eq("id", id);
  if (error) throw new Error(`removerSecretaria: ${error.message}`);
}

// ---------------------------------------------------------------------
// Superintendências
// ---------------------------------------------------------------------
export async function listarSuperintendencias(): Promise<Superintendencia[]> {
  const { data, error } = await supabaseBrowser()
    .from("superintendencias")
    .select("*")
    .order("nome");
  return check(data, error, "listarSuperintendencias").map(superintendenciaFromRow);
}
export async function upsertSuperintendencia(s: Superintendencia): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("superintendencias")
    .upsert(superintendenciaToRow(s));
  if (error) throw new Error(`upsertSuperintendencia: ${error.message}`);
}
export async function removerSuperintendencia(id: string): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("superintendencias")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`removerSuperintendencia: ${error.message}`);
}

// ---------------------------------------------------------------------
// Funções
// ---------------------------------------------------------------------
export async function listarFuncoes(): Promise<Funcao[]> {
  const { data, error } = await supabaseBrowser()
    .from("funcoes")
    .select("*")
    .order("hierarquia");
  return check(data, error, "listarFuncoes").map(funcaoFromRow);
}
export async function upsertFuncoes(funcoes: Funcao[]): Promise<void> {
  if (funcoes.length === 0) return;
  const { error } = await supabaseBrowser()
    .from("funcoes")
    .upsert(funcoes.map(funcaoToRow));
  if (error) throw new Error(`upsertFuncoes: ${error.message}`);
}
export async function removerFuncao(id: string): Promise<void> {
  const { error } = await supabaseBrowser().from("funcoes").delete().eq("id", id);
  if (error) throw new Error(`removerFuncao: ${error.message}`);
}

// ---------------------------------------------------------------------
// Usuários (profiles)
// ---------------------------------------------------------------------
export async function listarUsuarios(): Promise<Usuario[]> {
  // Lê pela view `usuarios_visiveis` (migration 0010): mesma visibilidade de
  // linhas da RLS de profiles, mas com CPF/MASP mascarados para quem não é
  // dono/master/gestor da secretaria. A escrita continua direto em `profiles`.
  const { data, error } = await supabaseBrowser()
    .from("usuarios_visiveis")
    .select("*")
    .order("nome");
  return check(data, error, "listarUsuarios").map(usuarioFromRow);
}
export async function upsertUsuario(u: Usuario): Promise<void> {
  const { error } = await supabaseBrowser().from("profiles").upsert(usuarioToRow(u));
  if (error) throw new Error(`upsertUsuario: ${error.message}`);
}
export async function removerUsuario(id: string): Promise<void> {
  const { error } = await supabaseBrowser().from("profiles").delete().eq("id", id);
  if (error) throw new Error(`removerUsuario: ${error.message}`);
}

// ---------------------------------------------------------------------
// Veículos
// ---------------------------------------------------------------------
export async function listarVeiculos(): Promise<Veiculo[]> {
  const { data, error } = await supabaseBrowser()
    .from("veiculos")
    .select("*")
    .order("modelo");
  return check(data, error, "listarVeiculos").map(veiculoFromRow);
}
export async function upsertVeiculo(v: Veiculo): Promise<void> {
  const { error } = await supabaseBrowser().from("veiculos").upsert(veiculoToRow(v));
  if (error) throw new Error(`upsertVeiculo: ${error.message}`);
}
export async function removerVeiculo(id: string): Promise<void> {
  const { error } = await supabaseBrowser().from("veiculos").delete().eq("id", id);
  if (error) throw new Error(`removerVeiculo: ${error.message}`);
}

// ---------------------------------------------------------------------
// Agendamentos
// ---------------------------------------------------------------------
export async function listarAgendamentos(): Promise<Agendamento[]> {
  const { data, error } = await supabaseBrowser()
    .from("agendamentos")
    .select("*")
    .order("inicio");
  return check(data, error, "listarAgendamentos").map(agendamentoFromRow);
}
export async function upsertAgendamento(a: Agendamento): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("agendamentos")
    .upsert(agendamentoToRow(a));
  if (error) throw new Error(`upsertAgendamento: ${error.message}`);
}
export async function removerAgendamento(id: string): Promise<void> {
  const { error } = await supabaseBrowser().from("agendamentos").delete().eq("id", id);
  if (error) throw new Error(`removerAgendamento: ${error.message}`);
}
