"use client";

import { useEffect } from "react";
import { useConfirmacao } from "@/components/confirmacao-provider";
import { EVENTO_ARMAZENAMENTO_CHEIO } from "@/lib/storage-aviso";

/**
 * Escuta o evento de "armazenamento cheio" (disparado pelos stores quando o
 * localStorage estoura) e mostra um aviso — assim uma alteração não fica
 * "perdida" silenciosamente.
 */
export function AvisoArmazenamento() {
  const { avisar } = useConfirmacao();

  useEffect(() => {
    let avisando = false;
    function aoEstourar() {
      if (avisando) return;
      avisando = true;
      void avisar({
        titulo: "Armazenamento do navegador cheio",
        mensagem:
          "A última alteração não pôde ser salva porque o espaço de armazenamento local deste navegador está cheio — normalmente por causa de muitas fotos enviadas. Remova algumas fotos ou limpe os dados de demonstração. (Na Fase 2, com o banco de dados, isso deixa de ser um limite.)",
        rotuloOk: "Entendi",
      });
      setTimeout(() => {
        avisando = false;
      }, 5000);
    }
    window.addEventListener(EVENTO_ARMAZENAMENTO_CHEIO, aoEstourar);
    return () =>
      window.removeEventListener(EVENTO_ARMAZENAMENTO_CHEIO, aoEstourar);
  }, [avisar]);

  return null;
}
