"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Building2, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { useSuperintendencias } from "@/lib/store/superintendencias-context";
import { useConfirmacao } from "@/components/confirmacao-provider";
import { SuperintendenciaForm } from "./superintendencia-form";
import type { Superintendencia } from "@/lib/mock/types";

export function SuperintendenciasTab() {
  const { superintendencias, remover } = useSuperintendencias();
  const { orgaos } = useOrgaos();
  const { usuarios } = useUsuarios();
  const { veiculos } = useVeiculos();
  const { confirmar } = useConfirmacao();
  const [editando, setEditando] = useState<Superintendencia | null>(null);
  const [criando, setCriando] = useState(false);
  const [secretariaNova, setSecretariaNova] = useState<string | undefined>(
    undefined,
  );

  // Agrupa superintendências por órgão, mantendo a ordem dos órgãos.
  const grupos = useMemo(
    () =>
      orgaos.map((o) => ({
        orgao: o,
        supers: superintendencias
          .filter((s) => s.secretariaId === o.id)
          .sort((a, b) => a.nome.localeCompare(b.nome)),
      })),
    [orgaos, superintendencias],
  );

  async function tentarRemover(s: Superintendencia) {
    const qtdUsuarios = usuarios.filter(
      (u) => u.superintendenciaId === s.id,
    ).length;
    const qtdVeiculos = veiculos.filter(
      (v) => v.superintendenciaId === s.id,
    ).length;
    const emUso = qtdUsuarios + qtdVeiculos;
    const ok = await confirmar({
      titulo: `Excluir "${s.nome}"?`,
      mensagem:
        emUso > 0
          ? `Esta superintendência está vinculada a ${qtdUsuarios} usuário(s) e ${qtdVeiculos} veículo(s). Ao excluir, esses vínculos ficam "sem superintendência" (não são apagados).`
          : "Esta ação não pode ser desfeita.",
      destrutivo: true,
      rotuloOk: "Excluir",
    });
    if (ok) remover(s.id);
  }

  function abrirNova(secretariaId?: string) {
    setSecretariaNova(secretariaId);
    setCriando(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Superintendências</h2>
          <p className="text-sm text-muted-foreground">
            Subdivisões dos órgãos, usadas no cadastro de usuários e veículos.
          </p>
        </div>
        <Button onClick={() => abrirNova()} disabled={orgaos.length === 0}>
          <Plus className="size-4" />
          Nova superintendência
        </Button>
      </div>

      {orgaos.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Cadastre um órgão antes (aba “Órgãos”) — toda superintendência
          pertence a um órgão.
        </Card>
      ) : (
        <div className="space-y-4">
          {grupos.map(({ orgao, supers }) => (
            <Card key={orgao.id} className="p-0 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-muted/30 border-b">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="size-4 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{orgao.nome}</span>
                  <Badge variant="secondary" className="font-mono">
                    {orgao.sigla}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => abrirNova(orgao.id)}
                >
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </div>

              {supers.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Nenhuma superintendência neste órgão.
                </p>
              ) : (
                <ul className="divide-y">
                  {supers.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 p-3">
                      <div className="flex items-center justify-center size-9 rounded-md bg-primary/10 text-primary shrink-0">
                        <Network className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{s.nome}</span>
                          <Badge variant="outline" className="font-mono">
                            {s.sigla}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditando(s)}
                          aria-label="Editar"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => tentarRemover(s)}
                          aria-label="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      <SuperintendenciaForm
        aberto={criando || editando !== null}
        superintendencia={editando}
        secretariaInicialId={secretariaNova}
        onClose={() => {
          setCriando(false);
          setEditando(null);
          setSecretariaNova(undefined);
        }}
      />
    </div>
  );
}
