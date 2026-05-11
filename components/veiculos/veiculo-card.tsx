"use client";

import { Car } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  corStatusVeiculo,
  rotuloStatusVeiculo,
} from "@/lib/formatters";
import type { Veiculo } from "@/lib/mock/types";

interface Props {
  veiculo: Veiculo;
  onClick: () => void;
}

/**
 * Card do veículo com altura consistente:
 * - Foto sempre na MESMA altura (h-44) — independente da largura da coluna,
 *   evitando alturas diferentes em cards lado a lado.
 * - Cabeçalho (nome + placa) ocupa duas linhas máximas via line-clamp.
 * - Área de observações reserva espaço fixo (min-h) para alinhar o rodapé
 *   dos cards lado a lado mesmo quando alguns não têm observação.
 */
export function VeiculoCard({ veiculo, onClick }: Props) {
  const nome = [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ");

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="overflow-hidden p-0 cursor-pointer transition-all gap-0 flex flex-col hover:shadow-md hover:-translate-y-0.5 ring-1 ring-border/60 hover:ring-primary/30"
    >
      {/* Foto: altura fixa para manter consistência visual entre cards */}
      <div className="relative h-44 w-full bg-gradient-to-br from-muted/60 to-muted/30 shrink-0">
        {veiculo.fotoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={veiculo.fotoUrl}
            alt={nome}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/70">
            <Car className="size-12" />
          </div>
        )}
        {/* Pílula de status sobreposta */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-background/85 backdrop-blur-sm px-2 py-1 text-[11px] font-medium shadow-sm">
          <span
            className={cn("size-2 rounded-full", corStatusVeiculo(veiculo.status))}
          />
          {rotuloStatusVeiculo(veiculo.status)}
        </div>
      </div>

      {/* Conteúdo: padding fixo + área de observações com altura mínima reservada */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">
            {nome || "Sem nome"}
          </h3>
          <Badge variant="secondary" className="font-mono shrink-0">
            {veiculo.placa}
          </Badge>
        </div>

        <div className="min-h-[2.5rem]">
          {veiculo.observacoes ? (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {veiculo.observacoes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/50 italic">
              Sem observações
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
