"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Car,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFuncoes } from "@/lib/store/funcoes-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { rotuloNivelAcesso } from "@/lib/formatters";
import { useConfirmacao } from "@/components/confirmacao-provider";
import { FuncaoForm } from "./funcao-form";
import type { Funcao } from "@/lib/mock/types";

export function HierarquiaTab() {
  const { funcoesOrdenadas, moverParaCima, moverParaBaixo, remover } =
    useFuncoes();
  const { usuarios } = useUsuarios();
  const { confirmar, avisar } = useConfirmacao();
  const [editando, setEditando] = useState<Funcao | null>(null);
  const [criando, setCriando] = useState(false);

  async function tentarRemover(f: Funcao) {
    const usados = usuarios.filter((u) => u.funcaoId === f.id).length;
    if (usados > 0) {
      await avisar({
        titulo: "Não é possível excluir",
        mensagem: `"${f.nome}" está em uso por ${usados} usuário${usados === 1 ? "" : "s"}. Reatribua-os a outra função antes de excluir.`,
      });
      return;
    }
    const ok = await confirmar({
      titulo: `Excluir "${f.nome}"?`,
      destrutivo: true,
      rotuloOk: "Excluir",
    });
    if (ok) remover(f.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Hierarquia de Funções</h2>
          <p className="text-sm text-muted-foreground">
            Funções ordenadas por prioridade (1 = topo). Use as setas para
            reordenar.
          </p>
        </div>
        <Button onClick={() => setCriando(true)}>
          <Plus className="size-4" />
          Nova função
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <ul className="divide-y">
          {funcoesOrdenadas.map((f, idx) => {
            const usados = usuarios.filter((u) => u.funcaoId === f.id).length;
            const ehPrimeiro = idx === 0;
            const ehUltimo = idx === funcoesOrdenadas.length - 1;
            return (
              <li key={f.id} className="flex items-center gap-3 p-3">
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => moverParaCima(f.id)}
                    disabled={ehPrimeiro || f.ehMaster}
                    aria-label="Mover para cima"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => moverParaBaixo(f.id)}
                    disabled={ehUltimo || f.ehMaster}
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-center size-9 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                  {f.hierarquia}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{f.nome}</span>
                    {f.ehMaster && (
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="size-3" />
                        Master
                      </Badge>
                    )}
                    {f.ehMotorista && (
                      <Badge variant="secondary" className="gap-1">
                        <Car className="size-3" />
                        Motorista
                      </Badge>
                    )}
                    {f.sistema && (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="size-3" />
                        Sistema
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {rotuloNivelAcesso(f.nivelAcesso)} · {usados} usuário
                    {usados === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditando(f)}
                    aria-label="Editar"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => tentarRemover(f)}
                    disabled={f.sistema}
                    aria-label="Excluir"
                    className="text-destructive hover:text-destructive disabled:text-muted-foreground"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <FuncaoForm
        aberto={criando || editando !== null}
        funcao={editando}
        onClose={() => {
          setCriando(false);
          setEditando(null);
        }}
      />
    </div>
  );
}
