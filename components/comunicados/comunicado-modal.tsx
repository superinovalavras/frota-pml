"use client";

import { useState } from "react";
import { Info, AlertTriangle, Siren, Loader2, type LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useComunicados } from "@/lib/store/comunicados-context";
import { TextoComunicado } from "./texto-comunicado";
import type { NivelComunicado } from "@/lib/mock/types";

const NIVEL: Record<
  NivelComunicado,
  { rotulo: string; icon: LucideIcon; faixa: string; badge: string }
> = {
  informativo: {
    rotulo: "Informativo",
    icon: Info,
    faixa: "bg-sky-500",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  },
  importante: {
    rotulo: "Importante",
    icon: AlertTriangle,
    faixa: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  urgente: {
    rotulo: "Urgente",
    icon: Siren,
    faixa: "bg-rose-500",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  },
};

export function ComunicadoModal() {
  const { pendentes, dispensar, fecharSessao } = useComunicados();
  const [processando, setProcessando] = useState(false);

  const atual = pendentes[0];
  if (!atual) return null;

  const cfg = NIVEL[atual.nivel] ?? NIVEL.informativo;
  const Icone = cfg.icon;

  async function aoDispensar(ciente: boolean) {
    if (!atual) return;
    setProcessando(true);
    try {
      await dispensar(atual.id, { ciente });
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        // Fechar pelo X / clique fora = fecha só nesta sessão (volta depois).
        if (!o) fecharSessao(atual.id);
      }}
    >
      <DialogContent className="max-w-lg overflow-hidden p-0 max-h-[88vh] overflow-y-auto">
        <div className={cn("h-1.5", cfg.faixa)} />
        <DialogHeader className="px-6 pt-5 pb-0 text-left">
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
              cfg.badge,
            )}
          >
            <Icone className="size-3.5" />
            {cfg.rotulo}
          </span>
          <DialogTitle className="text-xl mt-2">{atual.titulo}</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 text-sm">
          <TextoComunicado texto={atual.mensagem} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t px-6 py-3">
          {atual.exigeCiencia ? (
            <>
              <Button
                variant="outline"
                onClick={() => fecharSessao(atual.id)}
                disabled={processando}
              >
                Fechar
              </Button>
              <Button onClick={() => aoDispensar(true)} disabled={processando}>
                {processando && <Loader2 className="size-4 animate-spin" />}
                Li e estou ciente
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => fecharSessao(atual.id)}
                disabled={processando}
              >
                Fechar
              </Button>
              <Button onClick={() => aoDispensar(false)} disabled={processando}>
                {processando && <Loader2 className="size-4 animate-spin" />}
                Não mostrar novamente
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
