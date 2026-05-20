"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Wrench } from "lucide-react";
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
import { useVeiculos } from "@/lib/store/veiculos-context";
import { useAgendamentos } from "@/lib/store/agendamentos-context";
import { STATUS_AGENDAMENTO_ATIVOS } from "@/lib/agendamento-utils";
import type { Manutencao, Veiculo } from "@/lib/mock/types";

interface Props {
  veiculo: Veiculo;
  aberto: boolean;
  manutencaoAtiva: Manutencao | null;
  onClose: () => void;
  /** Disparado após sucesso. Recebe o veículo atualizado para o pai sincronizar. */
  onSucesso: () => void;
}

/**
 * Modal de manutenção:
 *  - Se NÃO há manutenção ativa: formulário para colocar em manutenção
 *    (motivo + previsão de retorno). Mostra preview das reservas que
 *    serão canceladas.
 *  - Se há manutenção ativa: exibe os dados e oferece "Encerrar manutenção".
 *
 * Disponível apenas para master/gestor (o pai controla a abertura).
 */
export function ManutencaoForm({
  veiculo,
  aberto,
  manutencaoAtiva,
  onClose,
  onSucesso,
}: Props) {
  const { recarregar: recarregarVeiculos } = useVeiculos();
  const { recarregar: recarregarAgendamentos, agendamentos } = useAgendamentos();
  const [motivo, setMotivo] = useState("");
  const [previsao, setPrevisao] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setMotivo("");
    setPrevisao("");
    setProcessando(false);
    setErro(null);
  }, [aberto]);

  // Reservas que seriam canceladas se a manutenção fosse criada agora com
  // a previsão informada. Atualiza ao vivo conforme a data muda.
  const reservasAfetadas = (() => {
    if (manutencaoAtiva || !previsao) return [];
    const fimDoDia = new Date(`${previsao}T23:59:59`);
    if (Number.isNaN(fimDoDia.getTime())) return [];
    return agendamentos.filter(
      (a) =>
        a.veiculoId === veiculo.id &&
        STATUS_AGENDAMENTO_ATIVOS.includes(a.status) &&
        new Date(a.inicio).getTime() <= fimDoDia.getTime(),
    );
  })();

  const dataMinima = (() => {
    const hoje = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
  })();

  async function aoColocarEmManutencao() {
    setErro(null);
    if (!motivo.trim()) {
      setErro("Informe o motivo da manutenção.");
      return;
    }
    if (!previsao) {
      setErro("Informe a previsão de retorno.");
      return;
    }
    setProcessando(true);
    try {
      const resp = await fetch("/api/manutencao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          veiculoId: veiculo.id,
          motivo: motivo.trim(),
          previsaoRetorno: previsao,
        }),
      });
      const json = (await resp.json()) as { erro?: string };
      if (!resp.ok) {
        throw new Error(json.erro ?? `HTTP ${resp.status}`);
      }
      await Promise.all([recarregarVeiculos(), recarregarAgendamentos()]);
      onSucesso();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao registrar manutenção.");
    } finally {
      setProcessando(false);
    }
  }

  async function aoEncerrar() {
    setErro(null);
    setProcessando(true);
    try {
      const resp = await fetch("/api/manutencao", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ veiculoId: veiculo.id }),
      });
      const json = (await resp.json()) as { erro?: string };
      if (!resp.ok) {
        throw new Error(json.erro ?? `HTTP ${resp.status}`);
      }
      await recarregarVeiculos();
      onSucesso();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao encerrar manutenção.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && !processando && onClose()}>
      <DialogContent className="max-w-md">
        {manutencaoAtiva ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="size-4" />
                Veículo em manutenção
              </DialogTitle>
              <DialogDescription>
                Encerre a manutenção para liberar o veículo. Os solicitantes
                cujas reservas foram canceladas não serão re-criadas
                automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Motivo registrado</p>
                <p className="font-medium">{manutencaoAtiva.motivo}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Previsão de retorno</p>
                <p className="font-medium">
                  {formatarData(manutencaoAtiva.previsaoRetorno)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Registrado em</p>
                <p className="font-medium">
                  {formatarDataHora(manutencaoAtiva.criadoEm)}
                </p>
              </div>
            </div>

            {erro && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-destructive">{erro}</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={processando}>
                Fechar
              </Button>
              <Button onClick={aoEncerrar} disabled={processando}>
                {processando ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Encerrando…
                  </>
                ) : (
                  "Encerrar manutenção"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="size-4" />
                Colocar em manutenção
              </DialogTitle>
              <DialogDescription>
                Informe o motivo e a previsão de retorno. As reservas futuras
                deste veículo serão canceladas automaticamente e os envolvidos
                serão notificados por email.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mf-motivo">Motivo</Label>
                <Textarea
                  id="mf-motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  placeholder="Ex.: Revisão preventiva — troca de óleo e filtros"
                  disabled={processando}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mf-previsao">Previsão de retorno</Label>
                <Input
                  id="mf-previsao"
                  type="date"
                  value={previsao}
                  min={dataMinima}
                  onChange={(e) => setPrevisao(e.target.value)}
                  disabled={processando}
                />
                <p className="text-xs text-muted-foreground">
                  O veículo ficará indisponível até o fim deste dia.
                </p>
              </div>

              {previsao && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  {reservasAfetadas.length === 0 ? (
                    <p className="text-muted-foreground">
                      Nenhuma reserva futura será afetada.
                    </p>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">
                        {reservasAfetadas.length}{" "}
                        {reservasAfetadas.length === 1
                          ? "reserva será cancelada"
                          : "reservas serão canceladas"}
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {reservasAfetadas.slice(0, 5).map((r) => (
                          <li key={r.id}>
                            • {formatarDataHora(r.inicio)} — {r.destino}
                          </li>
                        ))}
                        {reservasAfetadas.length > 5 && (
                          <li>… e mais {reservasAfetadas.length - 5}.</li>
                        )}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {erro && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-destructive">{erro}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={processando}>
                Cancelar
              </Button>
              <Button onClick={aoColocarEmManutencao} disabled={processando}>
                {processando ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Registrando…
                  </>
                ) : (
                  "Colocar em manutenção"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatarData(iso: string): string {
  // iso = 'YYYY-MM-DD'
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y}`;
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
