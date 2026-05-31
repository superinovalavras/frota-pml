"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, X, Info } from "lucide-react";
import { inscrever, type Notificacao } from "@/lib/notificacoes";

const DURACAO_PADRAO_MS = 6000;
const DURACAO_ERRO_MS = 12000;

export function Notificacoes() {
  const [itens, setItens] = useState<Notificacao[]>([]);

  useEffect(() => {
    const cancelar = inscrever((n) => {
      setItens((atual) => [...atual, n]);
      const ttl = n.tipo === "erro" ? DURACAO_ERRO_MS : DURACAO_PADRAO_MS;
      setTimeout(() => {
        setItens((atual) => atual.filter((x) => x.id !== n.id));
      }, ttl);
    });
    return cancelar;
  }, []);

  function dispensar(id: number) {
    setItens((atual) => atual.filter((n) => n.id !== id));
  }

  if (itens.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notificações"
      className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
    >
      {itens.map((n) => {
        const Icon =
          n.tipo === "ok"
            ? CheckCircle2
            : n.tipo === "erro"
              ? AlertTriangle
              : Info;
        const corBorda =
          n.tipo === "ok"
            ? "border-emerald-500/50"
            : n.tipo === "erro"
              ? "border-destructive/60"
              : "border-border";
        const corIcone =
          n.tipo === "ok"
            ? "text-emerald-500"
            : n.tipo === "erro"
              ? "text-destructive"
              : "text-muted-foreground";
        return (
          <div
            key={n.id}
            role={n.tipo === "erro" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-3 rounded-md border ${corBorda} bg-background p-3 shadow-md`}
          >
            <Icon className={`size-5 mt-0.5 shrink-0 ${corIcone}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">{n.mensagem}</p>
              {n.detalhe && (
                <p className="mt-1 text-xs text-muted-foreground break-words">
                  {n.detalhe}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dispensar"
              onClick={() => dispensar(n.id)}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
