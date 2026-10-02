"use client";

import { BadgeCheck, Car, Clock, Gauge, IdCard, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatHora } from "@/lib/formatters";
import type { Agendamento, Usuario, Veiculo } from "@/lib/mock/types";

/** Data + hora na hora de parede de Lavras (checkinEm/checkoutEm são UTC ISO). */
function dataHoraLavras(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Comprovante de viagem para MOSTRAR NA PORTARIA. Tela grande e glanceável que
 * prova que a saída (ou o retorno) foi registrada corretamente no app — o
 * porteiro só confere, não anota mais nada.
 *
 * - Viagem em andamento → comprovante de SAÍDA.
 * - Viagem concluída    → comprovante de RETORNO (com KM rodados).
 */
export function ComprovanteViagem({
  agendamento: a,
  veiculo,
  motorista,
  solicitante,
  onClose,
}: {
  agendamento: Agendamento | null;
  veiculo: Veiculo | undefined;
  motorista: Usuario | null;
  solicitante: Usuario | undefined;
  onClose: () => void;
}) {
  const aberto = !!a;
  if (!a) {
    return (
      <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }

  const ehRetorno = a.status === "concluido";
  const titulo = ehRetorno ? "Retorno registrado" : "Saída registrada";
  const quando = ehRetorno ? a.checkoutEm : a.checkinEm;
  const km = ehRetorno ? a.kmRetorno : a.kmSaida;
  const kmRodados =
    a.kmSaida !== undefined && a.kmRetorno !== undefined
      ? a.kmRetorno - a.kmSaida
      : undefined;

  const nomeVeic = veiculo
    ? `${[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")}`.trim() ||
      veiculo.modelo
    : "Veículo";
  const idCurto = a.id.slice(-6).toUpperCase();

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Comprovante de {ehRetorno ? "retorno" : "saída"}</DialogTitle>
        </DialogHeader>

        {/* Faixa PML no topo */}
        <div className="h-1.5 pml-faixa" />

        {/* Selo de confirmação */}
        <div className="bg-emerald-600 text-white px-6 py-6 text-center">
          <BadgeCheck className="size-14 mx-auto" strokeWidth={1.5} />
          <h2 className="text-2xl font-black tracking-tight mt-1">{titulo}</h2>
          <p className="text-sm/relaxed opacity-90 mt-0.5">
            Apresente esta tela na portaria
          </p>
        </div>

        <div className="px-6 py-5 space-y-3.5">
          {/* Veículo */}
          <Linha icon={Car} rotulo="Veículo">
            <span className="font-semibold">{nomeVeic}</span>
            {veiculo?.placa && (
              <span className="ml-1.5 font-mono text-sm text-muted-foreground">
                {veiculo.placa}
              </span>
            )}
          </Linha>

          {/* Motorista */}
          <Linha icon={IdCard} rotulo="Motorista">
            <span className="font-semibold">
              {motorista?.nome ?? solicitante?.nome ?? "—"}
            </span>
          </Linha>

          {/* Destino */}
          <Linha icon={MapPin} rotulo="Destino">
            <span className="font-medium">{a.destino || "—"}</span>
          </Linha>

          {/* Data/hora do registro */}
          <Linha icon={Clock} rotulo={ehRetorno ? "Retorno em" : "Saída em"}>
            <span className="font-semibold tabular-nums">
              {dataHoraLavras(quando)}
            </span>
          </Linha>

          {/* KM (se registrado) */}
          {km !== undefined && (
            <Linha icon={Gauge} rotulo="Quilometragem">
              <span className="font-semibold tabular-nums">
                {km.toLocaleString("pt-BR")} km
              </span>
              {ehRetorno && kmRodados !== undefined && (
                <span className="ml-1.5 text-sm text-muted-foreground">
                  ({kmRodados.toLocaleString("pt-BR")} km rodados)
                </span>
              )}
            </Linha>
          )}

          {/* Janela reservada (referência) */}
          <div className="pt-1 text-xs text-muted-foreground">
            Reserva: {formatHora(a.inicio)}–{formatHora(a.fim)}
            {solicitante ? ` · Solicitante: ${solicitante.nome}` : ""}
          </div>

          {/* Selo simples anti-confusão */}
          <div className="flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
            <span>
              Registro <span className="font-mono font-semibold">#{idCurto}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              Registrado no FROTA PML
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Linha({
  icon: Icon,
  rotulo,
  children,
}: {
  icon: typeof Car;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {rotulo}
        </div>
        <div className="leading-tight">{children}</div>
      </div>
    </div>
  );
}
