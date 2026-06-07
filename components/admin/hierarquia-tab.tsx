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
  Link2,
  Unlink,
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
  const {
    niveis,
    moverParaCima,
    moverParaBaixo,
    empatarComAcima,
    separar,
    remover,
  } = useFuncoes();
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

  const masterPresente = niveis[0]?.some((f) => f.ehMaster) ?? false;
  const minIndex = masterPresente ? 1 : 0;
  const maxIndex = niveis.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Hierarquia de Funções</h2>
          <p className="text-sm text-muted-foreground">
            Funções ordenadas por prioridade (1 = topo). Use as setas para
            reordenar e{" "}
            <Link2 className="inline size-3.5 align-text-bottom" /> para empatar
            dois cargos no mesmo nível.
          </p>
        </div>
        <Button onClick={() => setCriando(true)}>
          <Plus className="size-4" />
          Nova função
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <ul className="divide-y">
          {niveis.map((grupo, gi) => {
            const empatado = grupo.length > 1;
            return (
              <li key={gi} className="flex items-start gap-3 p-3">
                <div className="flex items-center justify-center size-9 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0 mt-0.5">
                  {gi + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  {empatado && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <Link2 className="size-3" />
                      {grupo.length} cargos empatados — mesma prioridade
                    </span>
                  )}
                  {grupo.map((f) => {
                    const usados = usuarios.filter(
                      (u) => u.funcaoId === f.id,
                    ).length;
                    const podeSubir =
                      !f.ehMaster && !(grupo.length === 1 && gi <= minIndex);
                    const podeDescer =
                      !f.ehMaster && !(grupo.length === 1 && gi >= maxIndex);
                    const podeEmpatar = !f.ehMaster && gi > minIndex;
                    const podeSeparar = !f.ehMaster && empatado;
                    return (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 rounded-md border bg-muted/20 px-2 py-1.5"
                      >
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => moverParaCima(f.id)}
                            disabled={!podeSubir}
                            aria-label="Subir um nível"
                            title="Subir um nível"
                          >
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => moverParaBaixo(f.id)}
                            disabled={!podeDescer}
                            aria-label="Descer um nível"
                            title="Descer um nível"
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">
                              {f.nome}
                            </span>
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
                        <div className="flex items-center gap-0.5">
                          {podeSeparar ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => separar(f.id)}
                              aria-label="Separar deste nível"
                              title="Separar deste nível (desfazer empate)"
                            >
                              <Unlink className="size-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => empatarComAcima(f.id)}
                              disabled={!podeEmpatar}
                              aria-label="Empatar com o nível acima"
                              title="Empatar com o nível acima"
                            >
                              <Link2 className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setEditando(f)}
                            aria-label="Editar"
                            title="Editar"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => tentarRemover(f)}
                            disabled={f.sistema}
                            aria-label="Excluir"
                            title="Excluir"
                            className="size-8 text-destructive hover:text-destructive disabled:text-muted-foreground"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
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
