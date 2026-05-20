/**
 * Leitura de manutenções a partir do navegador.
 *
 * As escritas (criar / encerrar) passam por `/api/manutencao` porque
 * envolvem efeitos colaterais — atualizar status do veículo, cancelar
 * reservas e enfileirar emails — que precisam de service_role.
 */
"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Manutencao } from "@/lib/mock/types";
import { manutencaoFromRow } from "./mappers";

export async function buscarManutencaoAtiva(
  veiculoId: string,
): Promise<Manutencao | null> {
  const { data, error } = await supabaseBrowser()
    .from("manutencoes")
    .select("*")
    .eq("veiculo_id", veiculoId)
    .is("encerrado_em", null)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`buscarManutencaoAtiva: ${error.message}`);
  return data ? manutencaoFromRow(data) : null;
}

export async function listarManutencoes(
  veiculoId: string,
): Promise<Manutencao[]> {
  const { data, error } = await supabaseBrowser()
    .from("manutencoes")
    .select("*")
    .eq("veiculo_id", veiculoId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(`listarManutencoes: ${error.message}`);
  return (data ?? []).map(manutencaoFromRow);
}
