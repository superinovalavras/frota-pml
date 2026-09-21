"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import {
  comunicadoFromRow,
  comunicadoToRow,
  comunicadoVistoFromRow,
} from "@/lib/data/mappers";
import type { Comunicado, ComunicadoVisto } from "@/lib/mock/types";

/** Todos os comunicados visíveis a quem chama (RLS filtra o alvo; master vê todos). */
export async function listarComunicados(): Promise<Comunicado[]> {
  const { data, error } = await supabaseBrowser()
    .from("comunicados")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(`listarComunicados: ${error.message}`);
  return (data ?? []).map(comunicadoFromRow);
}

/** Registros de dispensa/ciência do usuário atual (RLS: só os próprios). */
export async function listarMeusVistos(): Promise<ComunicadoVisto[]> {
  const { data, error } = await supabaseBrowser()
    .from("comunicados_vistos")
    .select("*");
  if (error) throw new Error(`listarMeusVistos: ${error.message}`);
  return (data ?? []).map(comunicadoVistoFromRow);
}

/** Cria/edita um comunicado (RLS: só master). */
export async function salvarComunicado(c: Comunicado): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("comunicados")
    .upsert(comunicadoToRow(c));
  if (error) throw new Error(`salvarComunicado: ${error.message}`);
}

export async function removerComunicado(id: string): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("comunicados")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`removerComunicado: ${error.message}`);
}

/**
 * Marca um comunicado como visto pelo usuário (dispensado + opcionalmente ciente).
 * As duas ações ("Não mostrar novamente" e "Li e estou ciente") dispensam.
 */
export async function registrarVisto(
  comunicadoId: string,
  profileId: string,
  opts: { ciente?: boolean } = {},
): Promise<void> {
  const agora = new Date().toISOString();
  const { error } = await supabaseBrowser()
    .from("comunicados_vistos")
    .upsert(
      {
        comunicado_id: comunicadoId,
        profile_id: profileId,
        dispensado: true,
        ciente_em: opts.ciente ? agora : null,
        visto_em: agora,
      },
      { onConflict: "comunicado_id,profile_id" },
    );
  if (error) throw new Error(`registrarVisto: ${error.message}`);
}

/** Quem já deu ciência num comunicado (master). */
export async function listarCiencias(
  comunicadoId: string,
): Promise<{ profileId: string; cienteEm: string | null }[]> {
  const { data, error } = await supabaseBrowser()
    .from("comunicados_vistos")
    .select("profile_id, ciente_em")
    .eq("comunicado_id", comunicadoId)
    .not("ciente_em", "is", null);
  if (error) throw new Error(`listarCiencias: ${error.message}`);
  return (data ?? []).map((r) => ({
    profileId: r.profile_id,
    cienteEm: r.ciente_em,
  }));
}
