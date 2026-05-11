"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Gauge, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAgendamentos } from "@/lib/store/agendamentos-context";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { lerImagemRedimensionada } from "@/lib/imagem";
import type { Agendamento } from "@/lib/mock/types";

export type TipoCheck = "saida" | "retorno";

interface Props {
  agendamento: Agendamento | null;
  tipo: TipoCheck | null;
  onClose: () => void;
  /** Chamado após salvar com sucesso (após alterarStatus). */
  onConcluido?: () => void;
}

export function CheckInOutDialog({
  agendamento,
  tipo,
  onClose,
  onConcluido,
}: Props) {
  const aberto = !!agendamento && !!tipo;
  const { salvar, alterarStatus } = useAgendamentos();
  const { veiculos, salvar: salvarVeiculo } = useVeiculos();
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [km, setKm] = useState<string>("");
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(undefined);
  const [observacoes, setObservacoes] = useState("");
  const [carregandoFoto, setCarregandoFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const veiculo = agendamento
    ? veiculos.find((v) => v.id === agendamento.veiculoId)
    : undefined;

  // km mínimo aceitável: na saída usa o kmAtual do veículo; no retorno usa kmSaida.
  const kmMinimo =
    tipo === "retorno"
      ? (agendamento?.kmSaida ?? veiculo?.kmAtual ?? 0)
      : (veiculo?.kmAtual ?? 0);

  // Reset ao abrir
  useEffect(() => {
    if (!aberto || !agendamento) return;
    setKm("");
    setFotoUrl(undefined);
    setObservacoes("");
    setErro(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, agendamento?.id, tipo]);

  async function aoSelecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCarregandoFoto(true);
    setErro(null);
    try {
      const dataUrl = await lerImagemRedimensionada(file);
      setFotoUrl(dataUrl);
    } catch (err) {
      console.error(err);
      setErro("Não foi possível ler a imagem.");
    } finally {
      setCarregandoFoto(false);
      if (inputFotoRef.current) inputFotoRef.current.value = "";
    }
  }

  function aoConfirmar() {
    if (!agendamento || !tipo) return;

    if (km.trim() === "") {
      setErro("Informe a quilometragem.");
      return;
    }
    const kmNum = Number(km);
    if (!Number.isFinite(kmNum) || kmNum < 0) {
      setErro("Informe um valor válido de quilometragem.");
      return;
    }
    if (kmNum < kmMinimo) {
      setErro(
        tipo === "retorno"
          ? `O km de retorno (${kmNum}) não pode ser menor que o km de saída (${kmMinimo}).`
          : `O km informado (${kmNum}) é menor que o km atual do veículo (${kmMinimo}).`,
      );
      return;
    }
    if (!fotoUrl) {
      setErro("A foto do painel é obrigatória.");
      return;
    }

    const agora = new Date().toISOString();
    const obsLimpa = observacoes.trim() || undefined;

    if (tipo === "saida") {
      salvar({
        ...agendamento,
        status: "em_andamento",
        checkinEm: agora,
        kmSaida: kmNum,
        fotoSaidaUrl: fotoUrl,
        obsSaida: obsLimpa,
      });
      // alterarStatus já é redundante (salvar mudou status), mas garante consistência se
      // outros consumidores observarem só status. Mantemos um path único.
      alterarStatus(agendamento.id, "em_andamento");
    } else {
      salvar({
        ...agendamento,
        status: "concluido",
        checkoutEm: agora,
        kmRetorno: kmNum,
        fotoRetornoUrl: fotoUrl,
        obsRetorno: obsLimpa,
      });
      alterarStatus(agendamento.id, "concluido");
      // Atualiza km do veículo
      if (veiculo && kmNum > veiculo.kmAtual) {
        salvarVeiculo({ ...veiculo, kmAtual: kmNum });
      }
    }

    onConcluido?.();
    onClose();
  }

  const titulo =
    tipo === "saida" ? "Check-in — saída do veículo" : "Check-out — retorno do veículo";
  const descricao =
    tipo === "saida"
      ? "Registre a quilometragem na partida com uma foto do painel."
      : "Registre a quilometragem na devolução com uma foto do painel.";
  const rotuloBotao = tipo === "saida" ? "Iniciar viagem" : "Concluir viagem";

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Foto do painel */}
          <div className="space-y-2">
            <Label>Foto do painel (odômetro)</Label>
            <div className="relative aspect-video w-full rounded-md border bg-muted/30 overflow-hidden flex items-center justify-center">
              {fotoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={fotoUrl}
                  alt="Foto do painel"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="size-8" />
                  <span className="text-xs">Nenhuma foto</span>
                </div>
              )}
              {carregandoFoto && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              )}
              {fotoUrl && !carregandoFoto && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 size-7"
                  onClick={() => setFotoUrl(undefined)}
                  aria-label="Remover foto"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={aoSelecionarFoto}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => inputFotoRef.current?.click()}
              disabled={carregandoFoto}
            >
              <Camera className="size-4" />
              {fotoUrl ? "Trocar foto" : "Fotografar painel"}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Em Fase 2 o OCR extrairá a quilometragem automaticamente — por
              ora, digite manualmente abaixo.
            </p>
          </div>

          {/* Km */}
          <div className="space-y-2">
            <Label htmlFor="ck-km" className="flex items-center gap-1.5">
              <Gauge className="size-4" />
              Quilometragem
            </Label>
            <Input
              id="ck-km"
              type="number"
              inputMode="numeric"
              min={kmMinimo}
              step={1}
              value={km}
              onChange={(e) => {
                setKm(e.target.value);
                setErro(null);
              }}
              placeholder={`Maior ou igual a ${kmMinimo.toLocaleString("pt-BR")}`}
            />
            <p className="text-[11px] text-muted-foreground">
              {tipo === "retorno"
                ? `Km na saída: ${agendamento?.kmSaida ?? "—"}`
                : `Último km registrado: ${veiculo?.kmAtual ?? 0}`}
            </p>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="ck-obs">Observações</Label>
            <Textarea
              id="ck-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder={
                tipo === "saida"
                  ? "Condições do veículo, combustível, avarias pré-existentes…"
                  : "Estado na devolução, avarias, abastecimento…"
              }
              rows={3}
            />
          </div>

          {erro && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 text-destructive text-sm px-3 py-2">
              {erro}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row sm:justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={aoConfirmar} disabled={carregandoFoto}>
            {rotuloBotao}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
