"use client";

import { useMemo } from "react";
import { Megaphone, Info, AlertTriangle, Siren, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePerfil } from "@/lib/perfil-context";
import { useComunicados } from "@/lib/store/comunicados-context";
import { TextoComunicado } from "./texto-comunicado";
import type { Comunicado, NivelComunicado } from "@/lib/mock/types";

const NIVEL: Record<NivelComunicado, { rotulo: string; icon: LucideIcon; cls: string }> = {
  informativo: { rotulo: "Informativo", icon: Info, cls: "text-sky-600" },
  importante: { rotulo: "Importante", icon: AlertTriangle, cls: "text-amber-600" },
  urgente: { rotulo: "Urgente", icon: Siren, cls: "text-rose-600" },
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

export function AvisosScreen() {
  const { usuario } = usePerfil();
  const { todos, carregando } = useComunicados();

  const meus = useMemo(() => {
    const agora = Date.now();
    return todos
      .filter(
        (c) =>
          c.publicoAlvo === "todos" ||
          c.secretarias.includes(usuario.secretariaId),
      )
      .map((c) => ({
        c,
        ativoAgora:
          c.ativo &&
          new Date(c.inicioEm).getTime() <= agora &&
          agora <= new Date(c.fimEm).getTime(),
      }))
      .sort(
        (a, b) =>
          new Date(b.c.inicioEm).getTime() - new Date(a.c.inicioEm).getTime(),
      );
  }, [todos, usuario.secretariaId]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Megaphone className="size-6" />
          Avisos
        </h1>
        <p className="text-sm text-muted-foreground">
          Comunicados enviados a você — inclusive os que você já fechou.
        </p>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : meus.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhum aviso por aqui.
        </Card>
      ) : (
        <ul className="space-y-3">
          {meus.map(({ c, ativoAgora }: { c: Comunicado; ativoAgora: boolean }) => {
            const n = NIVEL[c.nivel] ?? NIVEL.informativo;
            const Icone = n.icon;
            return (
              <Card key={c.id} className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Icone className={cn("size-4", n.cls)} />
                  <span className="font-medium">{c.titulo}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {n.rotulo}
                  </span>
                  {ativoAgora ? (
                    <Badge variant="secondary" className="text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[11px]">
                      Encerrado
                    </Badge>
                  )}
                </div>
                <TextoComunicado texto={c.mensagem} className="text-sm" />
                <p className="text-[11px] text-muted-foreground">
                  {fmt(c.inicioEm)} — {fmt(c.fimEm)}
                </p>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
