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
  formatTelefone,
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
import type {
  Agendamento,
  StatusAgendamento,
  Usuario,
} from "@/lib/mock/types";
import {
  CheckInOutDialog,
  type TipoCheck,
} from "@/components/agendamentos/check-in-out-dialog";
import { useConfirmacao } from "@/components/confirmacao-provider";
import { NOTIFICACOES_EMAIL_ATIVAS, REGISTRO_PAINEL_ATIVO } from "@/lib/flags";
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
  const { alterarStatus, cancelar, remover } = useAgendamentos();
  const { usuario: usuarioAtual } = usePerfil();
  const { confirmar } = useConfirmacao();
  const [tipoCheck, setTipoCheck] = useState<TipoCheck | null>(null);
  const [processandoCancel, setProcessandoCancel] = useState(false);

  async function aoCancelar() {
    if (!agendamento) return;
    const ok = await confirmar({
      titulo: "Cancelar esta reserva?",
      mensagem: NOTIFICACOES_EMAIL_ATIVAS
        ? "Solicitante, motorista e passageiros usuários serão notificados por email."
        : "Avise os envolvidos pelo telefone exibido na reserva, se necessário.",
      destrutivo: true,
      rotuloOk: "Cancelar reserva",
    });
    if (!ok) return;
    setProcessandoCancel(true);
    try {
      await cancelar(agendamento.id);
      onClose();
    } catch {
      // `cancelar` já notifica via toast; o dialog permanece aberto pra
      // o usuário ver o estado atualizado depois do recarregar.
    } finally {
      setProcessandoCancel(false);
    }
  }

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
            {solicitante ? <PessoaInfo usuario={solicitante} /> : "—"}
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
              <PessoaInfo usuario={motorista} />
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
                  <ul className="mt-1 space-y-2">
                    {passageiros.map((p, i) => {
                      if (p.tipo === "usuario") {
                        const u = buscarUsuario(p.usuarioId);
                        return (
                          <li key={i} className="flex items-start gap-2">
                            <User className="size-3.5 text-muted-foreground mt-1 shrink-0" />
                            <div className="flex-1 min-w-0">
                              {u ? (
                                <PessoaInfo usuario={u} />
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  Usuário removido
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      }
                      return (
                        <li key={i} className="flex items-start gap-2">
                          <UserPlus className="size-3.5 text-muted-foreground mt-1 shrink-0" />
                          <div className="flex-1 min-w-0 text-sm">
                            {p.nome}
                            <Badge
                              variant="outline"
                              className="ml-2 text-[10px]"
                            >
                              Convidado
                            </Badge>
                            {p.motivo && (
                              <span className="block text-xs text-muted-foreground">
                                {p.motivo}
                              </span>
                            )}
                          </div>
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
                const exigeCheck =
                  REGISTRO_PAINEL_ATIVO &&
                  (s === "em_andamento" || s === "concluido");
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant={variant}
                    disabled={s === "cancelado" && processandoCancel}
                    onClick={() => {
                      if (s === "em_andamento") {
                        setTipoCheck("saida");
                      } else if (s === "concluido") {
                        setTipoCheck("retorno");
                      } else if (s === "cancelado") {
                        // Vai pelo cancelar() para aguardar a resposta do servidor
                        // e mostrar erro caso o estado já tenha mudado.
                        void aoCancelar();
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

/**
 * Bloco padrão de pessoa na reserva (solicitante, motorista, passageiro):
 * nome → cargo → celular, de cima para baixo. O celular é um link `tel:`
 * (no celular, toca direto) — substitui as notificações por email.
 */
function PessoaInfo({ usuario }: { usuario: Usuario }) {
  return (
    <div className="min-w-0">
      <span className="block text-sm truncate">{usuario.nome}</span>
      {usuario.cargo && (
        <span className="block text-xs text-muted-foreground truncate">
          {usuario.cargo}
        </span>
      )}
      {usuario.telefone && (
        <a
          href={`tel:${usuario.telefone.replace(/\D/g, "")}`}
          className="block text-xs text-primary hover:underline"
        >
          {formatTelefone(usuario.telefone)}
        </a>
      )}
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
