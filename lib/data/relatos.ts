"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import { relatoFromRow } from "@/lib/data/mappers";
import type { RelatoVeiculo } from "@/lib/mock/types";

/** Relatos (ocorrências/defeitos) de um veículo, mais recentes primeiro. */
export async function listarRelatos(
  veiculoId: string,
): Promise<RelatoVeiculo[]> {
  const { data, error } = await supabaseBrowser()
    .from("relatos_veiculo")
    .select("*")
    .eq("veiculo_id", veiculoId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(`listarRelatos: ${error.message}`);
  return (data ?? []).map(relatoFromRow);
}

/** Relata um defeito (RLS: autor = o próprio usuário). */
export async function criarRelato(
  veiculoId: string,
  autorId: string,
  descricao: string,
): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("relatos_veiculo")
    .insert({ veiculo_id: veiculoId, autor_id: autorId, descricao });
  if (error) throw new Error(`criarRelato: ${error.message}`);
}

/** Marca/desmarca como resolvido (RLS: só master/gestor). */
export async function resolverRelato(
  id: string,
  resolvido: boolean,
  resolvidoPor: string,
): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("relatos_veiculo")
    .update({
      resolvido,
      resolvido_por: resolvido ? resolvidoPor : null,
      resolvido_em: resolvido ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new Error(`resolverRelato: ${error.message}`);
}

/** Exclui um relato (RLS: só master). */
export async function removerRelato(id: string): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("relatos_veiculo")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`removerRelato: ${error.message}`);
}
