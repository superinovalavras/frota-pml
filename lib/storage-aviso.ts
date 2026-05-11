/**
 * Pequeno canal de eventos para avisar a UI quando uma gravação no
 * localStorage falha (ex.: cota cheia por causa de muitas fotos).
 * Mantido fora de componentes para não inflar bundles que só precisam
 * disparar o aviso.
 */
export const EVENTO_ARMAZENAMENTO_CHEIO = "frota:armazenamento-cheio";

export function notificarArmazenamentoCheio() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_ARMAZENAMENTO_CHEIO));
}
