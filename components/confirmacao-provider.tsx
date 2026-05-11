"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface OpcoesConfirmar {
  titulo: string;
  mensagem?: string;
  destrutivo?: boolean;
  rotuloOk?: string;
  rotuloCancelar?: string;
}

interface OpcoesAvisar {
  titulo: string;
  mensagem?: string;
  rotuloOk?: string;
}

interface ConfirmacaoContextValue {
  confirmar: (opts: OpcoesConfirmar) => Promise<boolean>;
  avisar: (opts: OpcoesAvisar) => Promise<void>;
}

type Estado =
  | ({ tipo: "confirmar"; resolver: (v: boolean) => void } & OpcoesConfirmar)
  | ({ tipo: "avisar"; resolver: () => void } & OpcoesAvisar);

const Ctx = createContext<ConfirmacaoContextValue | null>(null);

export function ConfirmacaoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado | null>(null);

  const confirmar = useCallback((opts: OpcoesConfirmar) => {
    return new Promise<boolean>((resolve) => {
      setEstado({ tipo: "confirmar", ...opts, resolver: resolve });
    });
  }, []);

  const avisar = useCallback((opts: OpcoesAvisar) => {
    return new Promise<void>((resolve) => {
      setEstado({ tipo: "avisar", ...opts, resolver: resolve });
    });
  }, []);

  function fechar(escolha: boolean) {
    if (!estado) return;
    if (estado.tipo === "confirmar") {
      estado.resolver(escolha);
    } else {
      estado.resolver();
    }
    setEstado(null);
  }

  return (
    <Ctx.Provider value={{ confirmar, avisar }}>
      {children}
      <Dialog
        open={!!estado}
        onOpenChange={(o) => {
          if (!o) fechar(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {estado?.tipo === "confirmar" && estado.destrutivo && (
                <AlertTriangle className="size-5 text-destructive" />
              )}
              {estado?.titulo}
            </DialogTitle>
            {estado?.mensagem && (
              <DialogDescription className="whitespace-pre-line">
                {estado.mensagem}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="flex-row sm:justify-end gap-2">
            {estado?.tipo === "confirmar" && (
              <Button variant="outline" onClick={() => fechar(false)}>
                {estado.rotuloCancelar ?? "Cancelar"}
              </Button>
            )}
            <Button
              variant={
                estado?.tipo === "confirmar" && estado.destrutivo
                  ? "destructive"
                  : "default"
              }
              onClick={() => fechar(true)}
              autoFocus
            >
              {estado?.tipo === "confirmar"
                ? estado.rotuloOk ?? "Confirmar"
                : estado?.rotuloOk ?? "Entendi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

export function useConfirmacao() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useConfirmacao precisa estar dentro de <ConfirmacaoProvider>",
    );
  }
  return ctx;
}
