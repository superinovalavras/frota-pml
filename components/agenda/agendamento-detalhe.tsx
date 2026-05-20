"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import {
  formatHora,
  formatDataExtenso,
  rotuloStatusAgendamento,
} from "@/lib/formatters";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { useAgendamentos } from "@/lib/store/agendamentos-context";
import { usePerfil } from "@/lib/perfil-context";
import {
  proximosStatus,
  rotuloAcaoStatus,
  formatDuracao,
} from "@/lib/agendamento-utils";
import { useSuperintendencias } from "@/lib/store/superintendencias-context";
import type { Agendamento, StatusAgendamento } from "@/lib/mock/types";
import {
  CheckInOutDialog,
  type TipoCheck,
} from "@/components/agendamentos/check-in-out-dialog";
import { useConfirmacao } from "@/components/confirmacao-provider";
import {
  Car,
  Clock,
  MapPin,
  User,
  Users,
  IdCard,
  Building2,
  FileText,
  Pencil,
  Trash2,
  CheckCircle2,
  Play,
  Flag,
  XCircle,
  Sun,
  UserPlus,
  Navigation,
  Gauge,
  Camera,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  agendamento: Agendamento | null;
  onClose: () => void;
  onEditar?: (a: Agendamento) => void;
}

const ICONES_STATUS: Record<StatusAgendamento, LucideIcon> = {
  pendente: Clock,
  confirmado: CheckCircle2,
  em_andamento: Play,
  concluido: Flag,
  cancelado: XCircle,
  substituido: XCircle,
};

export function AgendamentoDetalhe({ agendamento, onClose, onEditar }: Props) {
  const { veiculos } = useVeiculos();
  const { buscarPorId: buscarUsuario } = useUsuarios();
  const { buscarPorId: buscarOrgao } = useOrgaos();
  const { buscarPorId: buscarSuperintendencia } = useSuperintendencias();
  const { alterarStatus, remover } = useAgendamentos();
  const { usuario: usuarioAtual } = usePerfil();
  const { confirmar } = useConfirmacao();
  const [tipoCheck, setTipoCheck] = useState<TipoCheck | null>(null);

  if (!agendamento) return null;

  const veiculo = veiculos.find((v) => v.id === agendamento.veiculoId);
  const solicitante = buscarUsuario(agendamento.solicitanteId);
  const motorista = agendamento.motoristaId
    ? buscarUsuario(agendamento.motoristaId)
    : null;
  const orgao = solicitante ? buscarOrgao(solicitante.secretariaId) : null;
  const superintendencia =
    solicitante && solicitante.superintendenciaId
      ? buscarSuperintendencia(solicitante.superintendenciaId) ?? null
      : null;

  const inicio = new Date(agendamento.inicio);
  const podeGerenciar =
    usuarioAtual.perfil === "master" ||
    usuarioAtual.perfil === "gestor" ||
    usuarioAtual.id === agendamento.solicitanteId ||
    usuarioAtual.id === agendamento.motoristaId;

  const ehGestorOuMaster =
    usuarioAtual.perfil === "master" || usuarioAtual.perfil === "gestor";
  // Solicitante/motorista podem mover o próprio fluxo (iniciar/concluir/cancelar),
  // mas a aprovação de "pendente → confirmado" exige gestor ou master.
  const acoes = podeGerenciar
    ? proximosStatus(agendamento.status).filter((s) => {
        if (s === "confirmado" && !ehGestorOuMaster) return false;
        return true;
      })
    : [];
  const passageiros = agendamento.passageiros ?? [];
  const mesmoLocal =
    !agendamento.localDevolucao ||
    agendamento.localDevolucao === agendamento.localPartida;

  async function aoExcluir() {
    if (!agendamento) return;
    const ok = await confirmar({
      titulo: `Excluir reserva "${agendamento.destino}"?`,
      mensagem: "Esta ação não pode ser desfeita.",
      destrutivo: true,
      rotuloOk: "Excluir",
    });
    if (ok) {
      remover(agendamento.id);
      onClose();
    }
  }

  return (
    <>
    <Dialog open={!!agendamento} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg">
                {agendamento.destino}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                {formatDataExtenso(inicio)}
                {agendamento.diaTodo && (
                  <Badge variant="secondary" className="gap-1">
                    <Sun className="size-3" />
                    Dia todo
                  </Badge>
                )}
              </DialogDescription>
            </div>
            <StatusBadge status={agendamento.status} />
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-3 text-sm">
          <Row icon={Clock} label={agendamento.diaTodo ? "Período" : "Horário"}>
            {agendamento.diaTodo ? (
              <span>
                Dia inteiro
                <span className="text-muted-foreground"> · 24h</span>
              </span>
            ) : (
              <span>
                {formatHora(agendamento.inicio)} —{" "}
                {formatHora(agendamento.fim)}{" "}
                <span className="text-muted-foreground">
                  · {formatDuracao(agendamento.inicio, agendamento.fim)}
                </span>
              </span>
            )}
          </Row>
          <Row icon={Car} label="Veículo">
            <div className="flex items-center gap-2">
              {veiculo?.fotoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={veiculo.fotoUrl}
                  alt=""
                  className="size-8 rounded object-cover ring-1 ring-border"
                />
              )}
              <span>
                {veiculo
                  ? `${[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")} · ${veiculo.placa}`
                  : "—"}
              </span>
            </div>
          </Row>
          <Row icon={MapPin} label="Local de partida">
            {agendamento.localPartida || (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>
          {!mesmoLocal && (
            <Row icon={Navigation} label="Local de devolução">
              {agendamento.localDevolucao}
            </Row>
          )}
          <Row icon={MapPin} label="Destino">
            {agendamento.destino}
          </Row>
          <Row icon={FileText} label="Finalidade">
            {agendamento.finalidade}
          </Row>

          <Separator />

          <Row icon={User} label="Solicitante">
            {solicitante?.nome ?? "—"}
            {solicitante?.cargo && (
              <span className="block text-xs text-muted-foreground">
                {solicitante.cargo}
              </span>
            )}
          </Row>
          <Row icon={Building2} label="Órgão">
            {orgao?.nome ?? "—"}
            {superintendencia && (
              <span className="block text-xs text-muted-foreground">
                {superintendencia.nome}
              </span>
            )}
          </Row>
          <Row icon={IdCard} label="Motorista">
            {motorista ? (
              <>
                {motorista.nome}
                {motorista.cnhCategoria && (
                  <span className="block text-xs text-muted-foreground">
                    CNH {motorista.cnhCategoria}
                    {motorista.cnhNumero ? ` · ${motorista.cnhNumero}` : ""}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Não designado</span>
            )}
          </Row>

          <Separator />

          {/* Passageiros */}
          <div>
            <div className="flex items-start gap-3">
              <Users className="size-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">
                  Passageiros ({passageiros.length})
                </div>
                {passageiros.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem passageiros listados.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {passageiros.map((p, i) => {
                      if (p.tipo === "usuario") {
                        const u = buscarUsuario(p.usuarioId);
                        const o = u ? buscarOrgao(u.secretariaId) : null;
                        return (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-sm"
                          >
                            <User className="size-3.5 text-muted-foreground" />
                            <span className="flex-1 min-w-0 truncate">
                              {u?.nome ?? "Usuário removido"}
                              {u?.cargo && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {u.cargo}
                                </span>
                              )}
                              {o && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {o.sigla}
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      }
                      return (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm"
                        >
                          <UserPlus className="size-3.5 text-muted-foreground" />
                          <span className="flex-1 min-w-0 truncate">
                            {p.nome}
                            {p.motivo && (
                              <span className="text-muted-foreground">
                                {" "}
                                · {p.motivo}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className="ml-2 text-[10px]"
                            >
                              Convidado
                            </Badge>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {agendamento.observacoes && (
            <>
              <Separator />
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Observações
                </p>
                <p>{agendamento.observacoes}</p>
              </div>
            </>
          )}

          {(agendamento.checkinEm || agendamento.checkoutEm) && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Registro de viagem
                </p>
                {agendamento.checkinEm && (
                  <RegistroCheck
                    titulo="Saída"
                    quando={agendamento.checkinEm}
                    km={agendamento.kmSaida}
                    fotoUrl={agendamento.fotoSaidaUrl}
                    observacoes={agendamento.obsSaida}
                  />
                )}
                {agendamento.checkoutEm && (
                  <RegistroCheck
                    titulo="Retorno"
                    quando={agendamento.checkoutEm}
                    km={agendamento.kmRetorno}
                    fotoUrl={agendamento.fotoRetornoUrl}
                    observacoes={agendamento.obsRetorno}
                    kmRodados={
                      agendamento.kmSaida !== undefined &&
                      agendamento.kmRetorno !== undefined
                        ? agendamento.kmRetorno - agendamento.kmSaida
                        : undefined
                    }
                  />
                )}
              </div>
            </>
          )}
        </div>

        {(acoes.length > 0 || podeGerenciar) && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">
              {acoes.map((s) => {
                const Icon = ICONES_STATUS[s];
                const variant =
                  s === "cancelado"
                    ? "outline"
                    : s === "concluido"
                      ? "secondary"
                      : "default";
                const exigeCheck = s === "em_andamento" || s === "concluido";
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant={variant}
                    onClick={() => {
                      if (s === "em_andamento") {
                        setTipoCheck("saida");
                      } else if (s === "concluido") {
                        setTipoCheck("retorno");
                      } else {
                        alterarStatus(agendamento.id, s);
                        onClose();
                      }
                    }}
                    className={
                      s === "cancelado"
                        ? "text-destructive hover:text-destructive"
                        : ""
                    }
                  >
                    <Icon className="size-4" />
                    {rotuloAcaoStatus(s)}
                    {exigeCheck && (
                      <Camera className="size-3.5 ml-0.5 opacity-70" />
                    )}
                  </Button>
                );
              })}
              {podeGerenciar && onEditar && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEditar(agendamento)}
                >
                  <Pencil className="size-4" />
                  Editar
                </Button>
              )}
              {(usuarioAtual.perfil === "master" ||
                usuarioAtual.perfil === "gestor") && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={aoExcluir}
                  className="text-destructive hover:text-destructive ml-auto"
                >
                  <Trash2 className="size-4" />
                  Excluir
                </Button>
              )}
            </div>
            {acoes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Reserva{" "}
                {rotuloStatusAgendamento(agendamento.status).toLowerCase()} —
                sem ações de status disponíveis.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
    <CheckInOutDialog
      agendamento={tipoCheck ? agendamento : null}
      tipo={tipoCheck}
      onClose={() => setTipoCheck(null)}
      onConcluido={() => {
        setTipoCheck(null);
        onClose();
      }}
    />
    </>
  );
}

function RegistroCheck({
  titulo,
  quando,
  km,
  fotoUrl,
  observacoes,
  kmRodados,
}: {
  titulo: string;
  quando: string;
  km?: number;
  fotoUrl?: string;
  observacoes?: string;
  kmRodados?: number;
}) {
  const dt = new Date(quando);
  const dataStr = formatDataExtenso(dt);
  const horaStr = formatHora(quando);
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-start gap-3">
        {fotoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={fotoUrl}
            alt={`Foto do painel — ${titulo.toLowerCase()}`}
            className="size-16 rounded object-cover ring-1 ring-border shrink-0"
          />
        ) : (
          <div className="size-16 rounded bg-muted flex items-center justify-center shrink-0">
            <Camera className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{titulo}</span>
            {km !== undefined && (
              <Badge variant="secondary" className="font-mono gap-1">
                <Gauge className="size-3" />
                {km.toLocaleString("pt-BR")} km
              </Badge>
            )}
            {kmRodados !== undefined && kmRodados > 0 && (
              <Badge variant="outline" className="font-mono">
                +{kmRodados.toLocaleString("pt-BR")} km rodados
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dataStr} · {horaStr}
          </p>
          {observacoes && (
            <p className="text-xs text-foreground/80 mt-1.5 whitespace-pre-line">
              {observacoes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
