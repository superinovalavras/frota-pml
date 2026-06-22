/**
 * Canal global de notificações (toasts) — bus simples sem dependências.
 *
 * Qualquer código (cliente ou rota de fetch dentro de um componente client)
 * pode chamar `notificarErro("...")` ou `notificarOk("...")` para mostrar
 * um toast. O componente `<Notificacoes />` (renderizado uma vez no layout
 * do dashboard) inscreve um listener e mostra as mensagens.
 *
 * Substitui o canal de UI que existia via <AvisoArmazenamento /> e que
 * tinha sido removido sem reposição.
 *
 * Família de notificações (ver docs/ARQUITETURA.md §8): este são os TOASTS de
 * UI — nada a ver com o banco. O "sininho" persistido está em
 * data/notificacoes.ts + notificar-eventos.ts (cliente) + notificar-server.ts.
 */

export type TipoNotificacao = "erro" | "ok" | "info";

export interface Notificacao {
  id: number;
  tipo: TipoNotificacao;
  mensagem: string;
  detalhe?: string;
  criadaEm: number;
}

type Listener = (n: Notificacao) => void;

const listeners = new Set<Listener>();
let proximoId = 1;

export function inscrever(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function emitir(tipo: TipoNotificacao, mensagem: string, detalhe?: string) {
  const n: Notificacao = {
    id: proximoId++,
    tipo,
    mensagem,
    detalhe,
    criadaEm: Date.now(),
  };
  // No SSR não há listeners — silencia.
  for (const l of listeners) {
    try {
      l(n);
    } catch (e) {
      // não propaga — um listener com bug não pode quebrar outros.
      console.error("notificacoes: listener com erro", e);
    }
  }
}

export function notificarErro(mensagem: string, detalhe?: string): void {
  emitir("erro", mensagem, detalhe);
}
export function notificarOk(mensagem: string, detalhe?: string): void {
  emitir("ok", mensagem, detalhe);
}
export function notificarInfo(mensagem: string, detalhe?: string): void {
  emitir("info", mensagem, detalhe);
}

/** Helper para chamadas a APIs: pega Error/string/unknown e mostra um erro. */
export function notificarFalha(rotulo: string, e: unknown): void {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  notificarErro(rotulo, msg || undefined);
  console.error(`${rotulo}:`, e);
}
