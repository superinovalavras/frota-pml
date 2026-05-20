"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { useConfirmacao } from "@/components/confirmacao-provider";
import { useSuperintendencias } from "@/lib/store/superintendencias-context";
import { OrgaoForm } from "./orgao-form";
import type { Secretaria } from "@/lib/mock/types";

export function OrgaosTab() {
  const { orgaos, remover } = useOrgaos();
  const { usuarios } = useUsuarios();
  const { veiculos } = useVeiculos();
  const { porSecretaria: superintendenciasPorSecretaria } = useSuperintendencias();
  const { confirmar, avisar } = useConfirmacao();
  const [editando, setEditando] = useState<Secretaria | null>(null);
  const [criando, setCriando] = useState(false);

  async function tentarRemover(o: Secretaria) {
    const qtdUsuarios = usuarios.filter((u) => u.secretariaId === o.id).length;
    const qtdVeiculos = veiculos.filter((v) => v.secretariaId === o.id).length;
    const qtdSupers = superintendenciasPorSecretaria(o.id).length;
    const total = qtdUsuarios + qtdVeiculos + qtdSupers;
    if (total > 0) {
      await avisar({
        titulo: "Não é possível excluir",
        mensagem: `"${o.nome}" está em uso:\n• ${qtdUsuarios} usuário(s)\n• ${qtdVeiculos} veículo(s)\n• ${qtdSupers} superintendência(s)\n\nReatribua ou remova esses vínculos antes.`,
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

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Órgãos da Prefeitura</h2>
          <p className="text-sm text-muted-foreground">
            Secretarias e demais lotações disponíveis nos cadastros.
          </p>
        </div>
        <Button onClick={() => setCriando(true)}>
          <Plus className="size-4" />
          Novo órgão
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <ul className="divide-y">
          {orgaos.map((o) => {
            const qtdUsuarios = usuarios.filter(
              (u) => u.secretariaId === o.id,
            ).length;
            const qtdVeiculos = veiculos.filter(
              (v) => v.secretariaId === o.id,
            ).length;
            return (
              <li key={o.id} className="flex items-center gap-3 p-3">
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
                    {qtdVeiculos} veículo{qtdVeiculos === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditando(o)}
                    aria-label="Editar"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => tentarRemover(o)}
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

      <OrgaoForm
        aberto={criando || editando !== null}
        orgao={editando}
        onClose={() => {
          setCriando(false);
          setEditando(null);
        }}
      />
    </div>
  );
}
