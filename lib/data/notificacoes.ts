/**
 * Notificações internas (sino da topbar) — acesso a dados pelo navegador.
 * A RLS garante: cada usuário só lê/atualiza as PRÓPRIAS notificações;
 * qualquer autenticado pode criar notificação para outra pessoa (é assim
 * que "motorista designado" chega ao motorista, por exemplo).
 *
 * Família de notificações (ver docs/ARQUITETURA.md §8): este é o CRUD do sino
 * pelo navegador. Emissores de alto nível = notificar-eventos.ts (cliente) e
 * notificar-server.ts (servidor); toasts de UI = lib/notificacoes.ts.
 */
"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { NotificacaoTipoDb } from "@/lib/supabase/types";

export type NotificacaoTipo = NotificacaoTipoDb;

export interface Notificacao {
  id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  agendamentoId: string | null;
  veiculoId: string | null;
  lida: boolean;
  criadoEm: string;
}

export interface NovaNotificacao {
  destinatarioId: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  agendamentoId?: string | null;
  veiculoId?: string | null;
}

const LIMITE = 50;

export async function listarMinhasNotificacoes(): Promise<Notificacao[]> {
  const { data, error } = await supabaseBrowser()
    .from("notificacoes")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(LIMITE);
  if (error) throw new Error(`listarMinhasNotificacoes: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    tipo: r.tipo,
    titulo: r.titulo,
    mensagem: r.mensagem,
    agendamentoId: r.agendamento_id,
    veiculoId: r.veiculo_id,
    lida: r.lida,
    criadoEm: r.criado_em,
  }));
}

export async function marcarNotificacaoLida(id: string): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("notificacoes")
    .update({ lida: true })
    .eq("id", id);
  if (error) throw new Error(`marcarNotificacaoLida: ${error.message}`);
}

export async function marcarTodasNotificacoesLidas(): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("notificacoes")
    .update({ lida: true })
    .eq("lida", false);
  if (error) throw new Error(`marcarTodasNotificacoesLidas: ${error.message}`);
}

/**
 * Cria notificações (uma por destinatário). Dedupe por destinatário e
 * NUNCA notifica quem disparou a ação (passe `excluirId` com o id do ator).
 * Falha silenciosa por design: notificação não pode quebrar a operação
 * principal (criar reserva, designar motorista...).
 */
export async function criarNotificacoes(
  lote: NovaNotificacao[],
  excluirId?: string,
): Promise<void> {
  const vistos = new Set<string>();
  const linhas = lote
    .filter((n) => {
      if (!n.destinatarioId || n.destinatarioId === excluirId) return false;
      if (vistos.has(`${n.destinatarioId}|${n.tipo}`)) return false;
      vistos.add(`${n.destinatarioId}|${n.tipo}`);
      return true;
    })
    .map((n) => ({
      destinatario_id: n.destinatarioId,
      tipo: n.tipo,
      titulo: n.titulo,
      mensagem: n.mensagem,
      agendamento_id: n.agendamentoId ?? null,
      veiculo_id: n.veiculoId ?? null,
    }));
  if (linhas.length === 0) return;
  const { error } = await supabaseBrowser().from("notificacoes").insert(linhas);
  if (error) console.error("criarNotificacoes:", error.message);
}
