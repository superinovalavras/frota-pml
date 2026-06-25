"use client";

import { useMemo, useState } from "react";
import { Plus, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { usePerfil } from "@/lib/perfil-context";
import { filtrarVeiculosVisiveis } from "@/lib/visibilidade";
import { VeiculoCard } from "./veiculo-card";
import { VeiculoForm } from "./veiculo-form";
import type { Veiculo } from "@/lib/mock/types";

export function VeiculosScreen() {
  const { veiculos } = useVeiculos();
  const { usuario } = usePerfil();

  const [modo, setModo] = useState<"criar" | "editar" | null>(null);
  const [editando, setEditando] = useState<Veiculo | null>(null);

  const visiveis = useMemo(
    () => filtrarVeiculosVisiveis(veiculos, usuario),
    [veiculos, usuario],
  );

  function abrirNovo() {
    setEditando(null);
    setModo("criar");
  }
  function abrirEdicao(v: Veiculo) {
    setEditando(v);
    setModo("editar");
  }
  function fechar() {
    setModo(null);
    setEditando(null);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Veículos</h1>
          <p className="text-sm text-muted-foreground">
            {visiveis.length}{" "}
            {visiveis.length === 1 ? "veículo cadastrado" : "veículos cadastrados"}
            {usuario.perfil !== "master" && " (visíveis para você)"}
          </p>
        </div>
        {usuario.perfil === "master" && (
          <Button onClick={abrirNovo}>
            <Plus className="size-4" />
            Novo veículo
          </Button>
        )}
      </div>

      {visiveis.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Car className="size-12 text-muted-foreground" />
            <div>
              <p className="font-medium">Nenhum veículo cadastrado</p>
              <p className="text-sm text-muted-foreground">
                Cadastre o primeiro veículo da frota.
              </p>
            </div>
            {usuario.perfil === "master" && (
              <Button onClick={abrirNovo} className="mt-2">
                <Plus className="size-4" />
                Adicionar veículo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visiveis.map((v) => (
            <VeiculoCard key={v.id} veiculo={v} onClick={() => abrirEdicao(v)} />
          ))}
        </div>
      )}

      <VeiculoForm modo={modo} veiculo={editando} onClose={fechar} />
    </div>
  );
}
