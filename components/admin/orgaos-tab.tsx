"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Building2, Network, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { useConfirmacao } from "@/components/confirmacao-provider";
import { useSuperintendencias } from "@/lib/store/superintendencias-context";
import { OrgaoForm } from "./orgao-form";
import { SuperintendenciaForm } from "./superintendencia-form";
import type { Secretaria, Superintendencia } from "@/lib/mock/types";

export function OrgaosTab() {
  const { orgaos, remover } = useOrgaos();
  const { usuarios } = useUsuarios();
  const { veiculos } = useVeiculos();
  const {
    porSecretaria: superintendenciasPorSecretaria,
    remover: removerSuper,
  } = useSuperintendencias();
  const { confirmar, avisar } = useConfirmacao();

  const [editandoOrgao, setEditandoOrgao] = useState<Secretaria | null>(null);
  const [criandoOrgao, setCriandoOrgao] = useState(false);

  const [editandoSuper, setEditandoSuper] = useState<Superintendencia | null>(
    null,
  );
  const [criandoSuperNoOrgao, setCriandoSuperNoOrgao] = useState<string | null>(
    null,
  );

  async function tentarRemoverOrgao(o: Secretaria) {
    const qtdUsuarios = usuarios.filter((u) => u.secretariaId === o.id).length;
    const qtdVeiculos = veiculos.filter((v) => v.secretariaId === o.id).length;
    const qtdSupers = superintendenciasPorSecretaria(o.id).length;
    const total = qtdUsuarios + qtdVeiculos + qtdSupers;
    if (total > 0) {
      await avisar({
        titulo: "Não é possível excluir",
        mensagem: `"${o.nome}" está em uso:\n• ${qtdUsuarios} usuário(s)\n• ${qtdVeiculos} veículo(s)\n• ${qtdSupers} subdivisão(ões)\n\nReatribua ou remova esses vínculos antes.`,
      });
      return;
    }
    const ok = await confirmar({
      titulo: `Excluir "${o.nome}"?`,
      destrutivo: true,
      rotuloOk: "Excluir",
    });
    if (ok) remover(o.id);
  }

  async function tentarRemoverSuper(s: Superintendencia) {
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
          ? `Está vinculada a ${qtdUsuarios} usuário(s) e ${qtdVeiculos} veículo(s). Ao excluir, esses vínculos ficam "sem subdivisão" (não são apagados).`
          : "Esta ação não pode ser desfeita.",
      destrutivo: true,
      rotuloOk: "Excluir",
    });
    if (ok) removerSuper(s.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Órgãos da Prefeitura</h2>
          <p className="text-sm text-muted-foreground">
            Secretarias e suas subdivisões (subsecretarias / superintendências).
          </p>
        </div>
        <Button onClick={() => setCriandoOrgao(true)}>
          <Plus className="size-4" />
          Novo órgão
        </Button>
      </div>

      <div className="space-y-3">
        {orgaos.map((o) => {
          const qtdUsuarios = usuarios.filter(
            (u) => u.secretariaId === o.id,
          ).length;
          const qtdVeiculos = veiculos.filter(
            (v) => v.secretariaId === o.id,
          ).length;
          const supers = superintendenciasPorSecretaria(o.id)
            .slice()
            .sort((a, b) => a.nome.localeCompare(b.nome));
          return (
            <Card key={o.id} className="p-0 overflow-hidden">
              {/* Cabeçalho do órgão */}
              <div className="flex items-center gap-3 p-3">
                <div className="flex items-center justify-center size-10 rounded-md bg-primary/10 text-primary shrink-0">
                  <Building2 className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{o.nome}</span>
                    <Badge variant="secondary" className="font-mono">
                      {o.sigla}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {qtdUsuarios} usuário{qtdUsuarios === 1 ? "" : "s"} ·{" "}
                    {qtdVeiculos} veículo{qtdVeiculos === 1 ? "" : "s"} ·{" "}
                    {supers.length} subdivisão{supers.length === 1 ? "" : "ões"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditandoOrgao(o)}
                    aria-label="Editar órgão"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => tentarRemoverOrgao(o)}
                    aria-label="Excluir órgão"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Subdivisões do órgão */}
              <div className="border-t bg-muted/20 px-3 py-2 space-y-1">
                {supers.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1 py-1">
                    Nenhuma subdivisão neste órgão.
                  </p>
                ) : (
                  supers.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-background/60"
                    >
                      <CornerDownRight className="size-3.5 text-muted-foreground shrink-0" />
                      <Network className="size-3.5 text-primary shrink-0" />
                      <span className="text-sm truncate flex-1">{s.nome}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {s.sigla}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setEditandoSuper(s)}
                        aria-label="Editar subdivisão"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => tentarRemoverSuper(s)}
                        aria-label="Excluir subdivisão"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary h-7"
                  onClick={() => setCriandoSuperNoOrgao(o.id)}
                >
                  <Plus className="size-3.5" />
                  Adicionar subdivisão
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <OrgaoForm
        aberto={criandoOrgao || editandoOrgao !== null}
        orgao={editandoOrgao}
        onClose={() => {
          setCriandoOrgao(false);
          setEditandoOrgao(null);
        }}
      />

      <SuperintendenciaForm
        aberto={criandoSuperNoOrgao !== null || editandoSuper !== null}
        superintendencia={editandoSuper}
        secretariaInicialId={criandoSuperNoOrgao ?? undefined}
        onClose={() => {
          setCriandoSuperNoOrgao(null);
          setEditandoSuper(null);
        }}
      />
    </div>
  );
}
