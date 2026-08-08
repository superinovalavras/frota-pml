"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { criarSupabaseAdmin, criarSupabaseServer } from "@/lib/supabase/server";
import { isoLocalParaTimestamptz } from "@/lib/data/mappers";
import type { Database } from "@/lib/supabase/types";

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
    return { ok: false, erro: "Apenas o Master pode apagar reservas em lote." };
  }
  return { ok: true, admin };
}

/**
 * Apaga reservas de um período JÁ ENCERRADAS (cujo fim já passou). Só o Master
 * pode executar. Usado depois de exportar o PDF do período, para liberar espaço
 * sem perder o registro (o PDF é o arquivo permanente).
 *
 * Segurança: nunca apaga viagens futuras ou em andamento — o filtro `fim < agora`
 * garante isso, mesmo que o período informado alcance datas futuras.
 *
 * @param inicioData "YYYY-MM-DD" (início do período, hora de Lavras)
 * @param fimData    "YYYY-MM-DD" (fim do período, inclusive)
 */
export async function apagarReservasEncerradas(
  inicioData: string,
  fimData: string,
): Promise<{ ok: true; apagadas: number } | { ok: false; erro: string }> {
  const aut = await exigirMaster();
  if (!aut.ok) return aut;
  const { admin } = aut;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicioData) || !/^\d{4}-\d{2}-\d{2}$/.test(fimData)) {
    return { ok: false, erro: "Período inválido." };
  }
  if (inicioData > fimData) {
    return { ok: false, erro: "A data inicial não pode ser depois da final." };
  }

  const inicioTs = isoLocalParaTimestamptz(`${inicioData}T00:00:00`);
  const fimTs = isoLocalParaTimestamptz(`${fimData}T23:59:59`);
  const agoraTs = new Date().toISOString();

  const { data, error } = await admin
    .from("agendamentos")
    .delete()
    .gte("inicio", inicioTs)
    .lte("inicio", fimTs)
    .lt("fim", agoraTs) // só as já encerradas
    .select("id");

  if (error) {
    return { ok: false, erro: `Falha ao apagar: ${error.message}` };
  }
  return { ok: true, apagadas: data?.length ?? 0 };
}

export type UsoArmazenamento = {
  bancoBytes: number;
  fotosBytes: number;
  fotosArquivos: number;
};

/**
 * Consumo atual de armazenamento (só Master): tamanho do banco + soma das fotos
 * no Storage. Lê via a função `uso_armazenamento` (migration 0012). Se a função
 * ainda não foi aplicada, devolve erro amigável (o medidor mostra "indisponível").
 */
export async function usoArmazenamento(): Promise<
  ({ ok: true } & UsoArmazenamento) | { ok: false; erro: string }
> {
  const aut = await exigirMaster();
  if (!aut.ok) return aut;
  // A função não está no schema tipado — chamada solta.
  const { data, error } = await (
    aut.admin as unknown as {
      rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc("uso_armazenamento");
  if (error || !data) {
    return {
      ok: false,
      erro: error?.message ?? "Medição indisponível (aplicar migration 0012).",
    };
  }
  const d = data as {
    banco_bytes: number;
    fotos_bytes: number;
    fotos_arquivos: number;
  };
  return {
    ok: true,
    bancoBytes: Number(d.banco_bytes) || 0,
    fotosBytes: Number(d.fotos_bytes) || 0,
    fotosArquivos: Number(d.fotos_arquivos) || 0,
  };
}
