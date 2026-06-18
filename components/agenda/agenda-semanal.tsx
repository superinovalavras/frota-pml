"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Sun,
  MousePointerClick,
  Car,
  IdCard,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePerfil } from "@/lib/perfil-context";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useAgendamentos } from "@/lib/store/agendamentos-context";
import { useSuperintendencias } from "@/lib/store/superintendencias-context";
import { filtrarVeiculosVisiveis } from "@/lib/visibilidade";
import {
  formatHora,
  formatTelefone,
  corStatusAgendamento,
  corStatusVeiculo,
  rotuloStatusVeiculo,
  rotuloStatusAgendamento,
} from "@/lib/formatters";
import { formatDuracao } from "@/lib/agendamento-utils";
import { AgendamentoDetalhe } from "./agendamento-detalhe";
import { AgendamentoForm } from "@/components/agendamentos/agendamento-form";
import type { Agendamento, Usuario, Veiculo } from "@/lib/mock/types";

const HORA_INICIO = 6;
const HORA_FIM = 20;
const ALTURA_HORA = 56;
const TOTAL_MINUTOS = (HORA_FIM - HORA_INICIO + 1) * 60;
/** Altura total da grade de horas (px) — usada pelo bloco de "dia todo". */
const ALTURA_GRADE = (HORA_FIM - HORA_INICIO + 1) * ALTURA_HORA;

const DIAS_SEMANA = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function dataParaInputLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDataHoraTooltip(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dataStr = d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const horaStr = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dataStr} · ${horaStr}`;
}

export function AgendaSemanal() {
  const { usuario } = usePerfil();
  const { veiculos } = useVeiculos();
  const { agendamentos } = useAgendamentos();
  const { buscarPorId: buscarUsuario } = useUsuarios();

  const [referencia, setReferencia] = useState<Date>(new Date());
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<string>("todos");
  const [filtroEscopo, setFiltroEscopo] = useState<"todas" | "minhas">("todas");
  const [detalhe, setDetalhe] = useState<Agendamento | null>(null);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Agendamento | null>(null);
  const [prefillInicio, setPrefillInicio] = useState<string | undefined>();
  const [prefillFim, setPrefillFim] = useState<string | undefined>();

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const inicioSemana = useMemo(() => startOfWeek(referencia), [referencia]);

  const dias = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicioSemana);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [inicioSemana]);

  const veiculosVisiveis = useMemo(
    () => filtrarVeiculosVisiveis(veiculos, usuario),
    [veiculos, usuario],
  );

  const agendamentosFiltrados = useMemo(() => {
    const idsVisiveis = new Set(veiculosVisiveis.map((v) => v.id));
    return agendamentos.filter((a) => {
      // Sempre mostra as reservas em que SOU solicitante ou motorista, mesmo
      // que o veículo seja de outra secretaria (ex.: servidor com CNH
      // designado para dirigir carro de outra área).
      const ehMinha =
        a.solicitanteId === usuario.id || a.motoristaId === usuario.id;
      if (!idsVisiveis.has(a.veiculoId) && !ehMinha) return false;
      if (veiculoSelecionado !== "todos" && a.veiculoId !== veiculoSelecionado)
        return false;
      if (filtroEscopo === "minhas") {
        if (a.solicitanteId !== usuario.id && a.motoristaId !== usuario.id)
          return false;
      }
      return true;
    });
  }, [
    agendamentos,
    veiculosVisiveis,
    veiculoSelecionado,
    filtroEscopo,
    usuario.id,
  ]);

  const agendamentosNaSemana = useMemo(() => {
    const ini = inicioSemana.getTime();
    const fim = new Date(inicioSemana);
    fim.setDate(fim.getDate() + 7);
    const fimMs = fim.getTime();
    return agendamentosFiltrados.filter((a) => {
      const t = new Date(a.inicio).getTime();
      return t >= ini && t < fimMs;
    });
  }, [agendamentosFiltrados, inicioSemana]);

  function navegar(deltaDias: number) {
    const d = new Date(referencia);
    d.setDate(d.getDate() + deltaDias);
    setReferencia(d);
  }

  function aoClicarSlotVazio(dia: Date, e: React.MouseEvent) {
    // EventoBloco já chama stopPropagation, mas se o clique pegar em algum filho
    // interno do bloco (avatar, texto), garantimos não abrir "novo agendamento".
    const alvo = e.target as HTMLElement;
    if (alvo.closest("[data-evento-bloco]")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutosTotal = Math.floor((y / ALTURA_HORA) * 60);
    const horaClicada = HORA_INICIO + Math.floor(minutosTotal / 60);
    let minClicado = Math.round((minutosTotal % 60) / 15) * 15;
    let horaFinal = horaClicada;
    if (minClicado === 60) {
      horaFinal += 1;
      minClicado = 0;
    }
    if (horaFinal > HORA_FIM) horaFinal = HORA_FIM;

    const inicio = new Date(dia);
    inicio.setHours(horaFinal, minClicado, 0, 0);
    const fim = new Date(inicio);
    fim.setHours(fim.getHours() + 1);

    setPrefillInicio(dataParaInputLocal(inicio));
    setPrefillFim(dataParaInputLocal(fim));
    setCriando(true);
  }

  function fecharForm() {
    setCriando(false);
    setEditando(null);
    setPrefillInicio(undefined);
    setPrefillFim(undefined);
  }

  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(fimSemana.getDate() + 6);

  const horas = Array.from(
    { length: HORA_FIM - HORA_INICIO + 1 },
    (_, i) => HORA_INICIO + i,
  );

  const hoje = new Date();
  const minutosAgora =
    (hoje.getHours() - HORA_INICIO) * 60 + hoje.getMinutes();
  const mostrarLinhaAgora =
    minutosAgora >= 0 && minutosAgora <= TOTAL_MINUTOS;

  const totalSemana = agendamentosNaSemana.length;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3 pb-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 pt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navegar(-7)}
              aria-label="Semana anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navegar(7)}
              aria-label="Próxima semana"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReferencia(new Date())}
              className="gap-2"
            >
              <CalendarDays className="size-4" />
              Hoje
            </Button>
            <div className="ml-2 text-sm font-medium">
              {inicioSemana.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}{" "}
              —{" "}
              {fimSemana.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
            {totalSemana > 0 && (
              <Badge variant="secondary" className="ml-1">
                {totalSemana} reserva{totalSemana === 1 ? "" : "s"}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-md border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setFiltroEscopo("todas")}
                className={cn(
                  "px-3 py-1 text-xs rounded transition-colors",
                  filtroEscopo === "todas"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFiltroEscopo("minhas")}
                className={cn(
                  "px-3 py-1 text-xs rounded transition-colors",
                  filtroEscopo === "minhas"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Minhas
              </button>
            </div>
            <FiltroVeiculo
              veiculos={veiculosVisiveis}
              valor={veiculoSelecionado}
              onChange={setVeiculoSelecionado}
            />
            <Button onClick={() => setCriando(true)}>
              <Plus className="size-4" />
              Novo agendamento
            </Button>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground px-6">
          <MousePointerClick className="size-3.5" />
          Dica: clique em um horário vazio para criar uma reserva já com o
          horário preenchido. Passe o mouse sobre uma reserva para ver detalhes.
        </div>

        {/* Calendário — sem scroll interno; rola junto com a página */}
        <Card className="mx-2 sm:mx-4 md:mx-6 p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Cabeçalho dos dias */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
            <div className="border-r" />
            {dias.map((dia, i) => {
              const ehHoje = isSameDay(dia, hoje);
              const qtd = agendamentosNaSemana.filter((a) =>
                isSameDay(new Date(a.inicio), dia),
              ).length;
              return (
                <div
                  key={i}
                  className={cn(
                    "px-2 py-3 text-center border-r last:border-r-0",
                    ehHoje && "bg-primary/5",
                  )}
                >
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">
                    {DIAS_SEMANA[i]}
                  </div>
                  <div
                    className={cn(
                      "text-lg font-semibold inline-flex items-center justify-center min-w-[28px] h-7 rounded-full",
                      ehHoje && "bg-primary text-primary-foreground",
                    )}
                  >
                    {dia.getDate().toString().padStart(2, "0")}
                  </div>
                  {qtd > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {qtd} reserva{qtd === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grade horária — sem scroll interno */}
          <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
            <div className="border-r">
              {horas.map((h) => (
                <div
                  key={h}
                  className="text-xs text-muted-foreground px-2 text-right -mt-2"
                  style={{ height: ALTURA_HORA }}
                >
                  {h.toString().padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {dias.map((dia, i) => {
              const agsDoDia = agendamentosNaSemana.filter((a) =>
                isSameDay(new Date(a.inicio), dia),
              );
              const ehHoje = isSameDay(dia, hoje);
              return (
                <DiaColuna
                  key={i}
                  dia={dia}
                  agendamentos={agsDoDia}
                  veiculos={veiculos}
                  horas={horas}
                  destacado={ehHoje}
                  mostrarLinhaAgora={ehHoje && mostrarLinhaAgora}
                  minutosAgora={minutosAgora}
                  onSelect={setDetalhe}
                  onClickVazio={aoClicarSlotVazio}
                  buscarUsuario={buscarUsuario}
                />
              );
            })}
          </div>
        </div>
        </div>
        </Card>

        <AgendamentoDetalhe
          agendamento={detalhe}
          onClose={() => setDetalhe(null)}
          onEditar={(a) => {
            setDetalhe(null);
            setEditando(a);
          }}
        />

        <AgendamentoForm
          aberto={criando || editando !== null}
          agendamento={editando}
          inicialInicio={prefillInicio}
          inicialFim={prefillFim}
          onClose={fecharForm}
        />
      </div>
    </TooltipProvider>
  );
}

function DiaColuna({
  dia,
  agendamentos,
  veiculos,
  horas,
  destacado,
  mostrarLinhaAgora,
  minutosAgora,
  onSelect,
  onClickVazio,
  buscarUsuario,
}: {
  dia: Date;
  agendamentos: Agendamento[];
  veiculos: Veiculo[];
  horas: number[];
  destacado: boolean;
  mostrarLinhaAgora: boolean;
  minutosAgora: number;
  onSelect: (a: Agendamento) => void;
  onClickVazio: (dia: Date, e: React.MouseEvent) => void;
  buscarUsuario: (id: string) => Usuario | undefined;
}) {
  const agsDiaTodo = agendamentos.filter((a) => a.diaTodo);
  const agsTimed = agendamentos.filter((a) => !a.diaTodo);
  const temTimed = agsTimed.length > 0;
  const nAll = agsDiaTodo.length;
  // Faixas lado a lado: uma por reserva de dia todo + (se houver) uma para as
  // reservas com horário. Assim nada se sobrepõe.
  const totalFaixas = nAll + (temTimed ? 1 : 0);
  const larguraFaixa = totalFaixas > 0 ? 100 / totalFaixas : 100;

  return (
    <div
      onClick={(e) => onClickVazio(dia, e)}
      className={cn(
        "relative border-r last:border-r-0 cursor-pointer hover:bg-foreground/[0.015] transition-colors",
        destacado && "bg-primary/5",
      )}
    >
      {horas.map((h) => (
        <div
          key={h}
          className="border-b border-dashed border-border/60"
          style={{ height: ALTURA_HORA }}
        />
      ))}

      {mostrarLinhaAgora && (
        <div
          className="absolute left-0 right-0 z-10 pointer-events-none"
          style={{ top: (minutosAgora / 60) * ALTURA_HORA }}
        >
          <div className="relative h-px bg-red-500 shadow-sm">
            <div className="absolute -left-1.5 -top-1.5 size-3 rounded-full bg-red-500 ring-2 ring-background" />
            <div className="absolute right-1 -top-3 text-[10px] font-semibold text-red-600 bg-background px-1 rounded">
              agora
            </div>
          </div>
        </div>
      )}

      {/* Reservas de DIA TODO — ocupam a coluna inteira (altura total). */}
      {agsDiaTodo.map((a, idx) => (
        <EventoCard
          key={a.id}
          agendamento={a}
          veiculos={veiculos}
          buscarUsuario={buscarUsuario}
          altura={ALTURA_GRADE}
          posStyle={{
            left: `calc(${idx * larguraFaixa}% + 2px)`,
            width: `calc(${larguraFaixa}% - 4px)`,
            top: 0,
            height: ALTURA_GRADE,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(a);
          }}
        />
      ))}

      {/* Reservas com HORÁRIO — na faixa restante à direita das de dia todo. */}
      <div
        className="absolute inset-y-0"
        style={{ left: `${nAll * larguraFaixa}%`, right: 0 }}
      >
        {agsTimed.map((a) => {
          const ini = new Date(a.inicio);
          const f = new Date(a.fim);
          const mIni = (ini.getHours() - HORA_INICIO) * 60 + ini.getMinutes();
          const mFim = (f.getHours() - HORA_INICIO) * 60 + f.getMinutes();
          const top = Math.max(0, (mIni / 60) * ALTURA_HORA);
          const altura = Math.max(24, ((mFim - mIni) / 60) * ALTURA_HORA);
          return (
            <EventoCard
              key={a.id}
              agendamento={a}
              veiculos={veiculos}
              buscarUsuario={buscarUsuario}
              altura={altura}
              posClass="left-1 right-1"
              posStyle={{ top, height: altura }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(a);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Bloco de reserva na agenda. A foto do veículo vira o FUNDO (object-cover),
 * adaptando-se a qualquer tamanho — de uma reserva de 1h até "dia todo".
 * Sem foto, mantém o fundo colorido do status. A borda esquerda sempre
 * indica o status.
 */
function EventoCard({
  agendamento: a,
  veiculos,
  buscarUsuario,
  altura,
  posClass,
  posStyle,
  onClick,
}: {
  agendamento: Agendamento;
  veiculos: Veiculo[];
  buscarUsuario: (id: string) => Usuario | undefined;
  /** Altura do bloco (px) — decide quantas infos cabem. */
  altura: number;
  /** Classes de posição (ex.: "left-1 right-1" para reservas com horário). */
  posClass?: string;
  /** Estilo de posição (top/height; para dia todo também left/width). */
  posStyle: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
}) {
  const veiculo = veiculos.find((v) => v.id === a.veiculoId);
  const motorista = (a.motoristaId ? buscarUsuario(a.motoristaId) : null) ?? null;
  const solicitante = buscarUsuario(a.solicitanteId);
  const foto = veiculo?.fotoUrl;
  const isDiaTodo = !!a.diaTodo;
  const nomeVeic = veiculo
    ? `${veiculo.placa} · ${veiculo.modelo}`
    : "Veículo removido";
  const tempo = isDiaTodo
    ? "Dia todo"
    : `${formatHora(a.inicio)}–${formatHora(a.fim)}`;
  // Com foto + horário: texto embaixo (sobre o degradê). Caso contrário, topo.
  const alinhar = !foto || isDiaTodo ? "justify-start" : "justify-end";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-evento-bloco
          onClick={onClick}
          className={cn(
            "absolute rounded-md border-l-4 overflow-hidden text-left",
            "shadow-sm hover:shadow-md hover:z-20 hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer",
            posClass,
            corStatusAgendamento(a.status),
            foto && "text-white",
          )}
          style={posStyle}
        >
          {foto && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto}
                alt={nomeVeic}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className={cn(
                  "absolute inset-0",
                  isDiaTodo
                    ? "bg-gradient-to-b from-black/80 via-black/35 to-transparent"
                    : "bg-gradient-to-t from-black/80 via-black/35 to-transparent",
                )}
              />
            </>
          )}

          <div
            className={cn(
              "relative h-full flex flex-col gap-0.5 px-1.5 py-1",
              alinhar,
            )}
          >
            <div
              className={cn(
                "leading-tight truncate flex items-center gap-1",
                isDiaTodo
                  ? "text-[10px] font-semibold uppercase tracking-wide"
                  : "text-[11px] font-semibold",
              )}
            >
              {isDiaTodo && <Sun className="size-3 shrink-0" />}
              {tempo}
            </div>

            <div className="text-xs font-semibold leading-tight truncate">
              {a.destino}
            </div>

            {altura > 60 && (
              <div className="flex items-center gap-1 text-[10px] opacity-90 leading-tight truncate">
                <Car className="size-3 shrink-0" />
                <span className="truncate">{nomeVeic}</span>
              </div>
            )}

            {isDiaTodo && (
              <div className="flex items-center gap-1 text-[10px] opacity-90 leading-tight truncate">
                <Clock className="size-3 shrink-0" />
                Volta {formatHora(a.fim)}
              </div>
            )}

            {altura > 88 && solicitante && (
              <div className="flex items-center gap-1 text-[10px] italic opacity-80 leading-tight truncate">
                <IdCard className="size-3 shrink-0" />
                <span className="truncate">{solicitante.nome}</span>
              </div>
            )}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContentRico
        agendamento={a}
        veiculo={veiculo}
        motorista={motorista}
        solicitante={solicitante}
      />
    </Tooltip>
  );
}

function TooltipContentRico({
  agendamento: a,
  veiculo,
  motorista,
  solicitante,
}: {
  agendamento: Agendamento;
  veiculo: Veiculo | undefined;
  motorista: Usuario | null;
  solicitante: Usuario | undefined;
}) {
  const nomeVeiculo = veiculo
    ? `${[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")} · ${veiculo.placa}`
    : "Veículo removido";

  const horarioStr = a.diaTodo
    ? `${new Date(a.inicio).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} · dia todo`
    : `${formatDataHoraTooltip(a.inicio)} → ${formatHora(a.fim)} (${formatDuracao(a.inicio, a.fim)})`;

  return (
    <TooltipContent
      side="right"
      align="start"
      sideOffset={8}
      collisionPadding={12}
      className="max-w-[280px] px-3 py-2 text-xs leading-snug"
    >
      <div className="space-y-1.5">
        <div>
          <div className="font-semibold leading-tight">{a.destino}</div>
          <div className="opacity-75 mt-0.5">
            {rotuloStatusAgendamento(a.status)}
          </div>
        </div>
        <div className="border-t border-background/20 pt-1.5 space-y-1">
          <div className="flex items-start gap-1.5">
            <Clock className="size-3 opacity-70 mt-0.5 shrink-0" />
            <span className="break-words">{horarioStr}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Car className="size-3 opacity-70 mt-0.5 shrink-0" />
            <span className="break-words">{nomeVeiculo}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <IdCard className="size-3 opacity-70 mt-0.5 shrink-0" />
            <span className="break-words">
              {motorista?.nome ?? "Motorista não designado"}
            </span>
          </div>
        </div>
        <div className="border-t border-background/20 pt-1.5 opacity-60 text-[11px]">
          Solicitante: {solicitante?.nome ?? "—"}
          {solicitante?.telefone
            ? ` · ${formatTelefone(solicitante.telefone)}`
            : ""}{" "}
          · clique para ver tudo
        </div>
      </div>
    </TooltipContent>
  );
}

function FiltroVeiculo({
  veiculos,
  valor,
  onChange,
}: {
  veiculos: Veiculo[];
  valor: string;
  onChange: (v: string) => void;
}) {
  const { buscarPorId: buscarSuperintendencia } = useSuperintendencias();
  return (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
    >
      <option value="todos">Todos os veículos visíveis</option>
      {veiculos.map((v) => {
        const lotacao = v.superintendenciaId
          ? buscarSuperintendencia(v.superintendenciaId)?.sigla
          : "Frota geral";
        return (
          <option key={v.id} value={v.id}>
            {v.placa} — {v.modelo} ({lotacao})
          </option>
        );
      })}
    </select>
  );
}

export function LegendaStatus() {
  const itens: { label: string; classe: string }[] = [
    { label: "Confirmado", classe: "bg-sky-100 border-sky-300" },
    { label: "Pendente", classe: "bg-amber-100 border-amber-300" },
    { label: "Em andamento", classe: "bg-emerald-100 border-emerald-400" },
    { label: "Concluído", classe: "bg-zinc-100 border-zinc-300" },
    { label: "Cancelado", classe: "bg-rose-50 border-rose-300" },
    { label: "Substituído", classe: "bg-violet-100 border-violet-300" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 md:px-6 pb-4">
      <span className="text-xs text-muted-foreground">Status:</span>
      {itens.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs">
          <span className={cn("size-3 rounded border-l-4", i.classe)} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function ResumoFrota() {
  const { usuario } = usePerfil();
  const { veiculos } = useVeiculos();
  const visiveis = filtrarVeiculosVisiveis(veiculos, usuario);

  const contagem = visiveis.reduce(
    (acc, v) => {
      acc[v.status] = (acc[v.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const itens = (
    ["disponivel", "em_uso", "manutencao", "indisponivel"] as const
  ).map((s) => ({
    status: s,
    label: rotuloStatusVeiculo(s),
    cor: corStatusVeiculo(s),
    qtd: contagem[s] ?? 0,
  }));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-6 pb-2">
      {itens.map((i) => (
        <Card key={i.status} className="p-4">
          <div className="flex items-center gap-3">
            <span className={cn("size-3 rounded-full", i.cor)} />
            <div className="flex-1">
              <div className="text-2xl font-semibold leading-none">
                {i.qtd}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {i.label}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
