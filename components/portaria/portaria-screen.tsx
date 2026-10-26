"use client";

import { useMemo, useState } from "react";
import {
  DoorOpen,
  AlertTriangle,
  Clock,
  MapPin,
  Search,
  Copy,
  Check,
  Gauge,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAgendamentos } from "@/lib/store/agendamentos-context";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { formatHora, formatTelefone } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Agendamento, Usuario, Veiculo } from "@/lib/mock/types";

function mesmoDia(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function labelAtraso(fimIso: string, agora: Date): string {
  const min = Math.floor((agora.getTime() - new Date(fimIso).getTime()) / 60000);
  if (min < 60) return `atrasado ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `atrasado ${h}h${m > 0 ? `${m}min` : ""}`;
}

function nomeVeiculo(v: Veiculo | undefined): string {
  if (!v) return "Veículo";
  return [v.marca, v.modelo].filter(Boolean).join(" ").trim() || v.modelo;
}

export function PortariaScreen() {
  const { agendamentos, carregando: carA } = useAgendamentos();
  const { veiculos, carregando: carV } = useVeiculos();
  const { buscarPorId: buscarUsuario } = useUsuarios();
  const { buscarPorId: buscarOrgao } = useOrgaos();

  const [busca, setBusca] = useState("");

  const agora = new Date();
  const veiculoPorId = useMemo(
    () => new Map(veiculos.map((v) => [v.id, v])),
    [veiculos],
  );

  const condutorDe = (a: Agendamento): Usuario | undefined =>
    buscarUsuario(a.motoristaId ?? a.solicitanteId);
  const siglaSec = (u: Usuario | undefined): string =>
    u ? buscarOrgao(u.secretariaId)?.sigla ?? "" : "";

  const naRua = useMemo(() => {
    const lista = agendamentos.filter((a) => a.status === "em_andamento");
    return lista
      .map((a) => ({ a, atrasado: new Date(a.fim).getTime() < agora.getTime() }))
      .sort((x, y) => {
        if (x.atrasado !== y.atrasado) return x.atrasado ? -1 : 1;
        return (x.a.checkinEm ?? x.a.inicio).localeCompare(
          y.a.checkinEm ?? y.a.inicio,
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendamentos]);

  const totalAtrasados = naRua.filter((x) => x.atrasado).length;

  const previstasHoje = useMemo(() => {
    return agendamentos
      .filter((a) => a.status === "confirmado" && mesmoDia(a.inicio, agora))
      .sort((x, y) => x.inicio.localeCompare(y.inicio));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendamentos]);

  const disponiveis = veiculos.filter((v) => v.status === "disponivel").length;

  const historico = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = agendamentos
      .filter((a) => a.status === "concluido")
      .sort((x, y) =>
        (y.checkoutEm ?? y.fim).localeCompare(x.checkoutEm ?? x.fim),
      );
    if (!q) return base.slice(0, 15);
    return base
      .filter((a) => {
        const v = veiculoPorId.get(a.veiculoId);
        const u = condutorDe(a);
        const alvo = [
          v?.placa,
          nomeVeiculo(v),
          u?.nome,
          a.destino,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return alvo.includes(q);
      })
      .slice(0, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendamentos, busca, veiculoPorId]);

  if (carA || carV) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <DoorOpen className="size-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">Portaria</h1>
            <p className="text-xs text-muted-foreground">
              Frota em tempo real · só monitoramento
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-emerald-500" /> ao vivo
        </span>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {totalAtrasados > 0 && (
          <Contador
            rotulo="Atrasados"
            valor={totalAtrasados}
            tom="rose"
            icone={<AlertTriangle className="size-4" />}
          />
        )}
        <Contador rotulo="Na rua agora" valor={naRua.length} tom="amber" />
        <Contador rotulo="Previstas hoje" valor={previstasHoje.length} />
        <Contador rotulo="Disponíveis" valor={disponiveis} tom="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Na rua agora */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Na rua agora
          </h2>
          {naRua.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum veículo na rua agora.
            </p>
          ) : (
            <ul className="space-y-3">
              {naRua.map(({ a, atrasado }) => {
                const v = veiculoPorId.get(a.veiculoId);
                const u = condutorDe(a);
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "rounded-xl border p-4",
                      atrasado
                        ? "border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10"
                        : "bg-card",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">
                          {nomeVeiculo(v)}
                          {v?.placa && (
                            <span className="ml-1.5 font-mono text-sm text-muted-foreground">
                              {v.placa}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-sm text-muted-foreground">
                          {u?.nome ?? "—"}
                          {siglaSec(u) ? ` · ${siglaSec(u)}` : ""}
                        </div>
                      </div>
                      {atrasado && (
                        <span className="shrink-0 rounded-full border border-rose-300 bg-background px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:border-rose-500/40 dark:text-rose-300">
                          {labelAtraso(a.fim, agora)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-4" /> {a.destino || "—"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-4" />
                        {a.checkinEm ? `saiu ${formatHora(a.checkinEm)}` : "em viagem"}
                        {" · volta prev. "}
                        {formatHora(a.fim)}
                      </span>
                    </div>
                    {u?.telefone && (
                      <div className="mt-3 flex justify-end border-t pt-3">
                        <TelefoneCopiavel telefone={u.telefone} destaque={atrasado} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Previstas para hoje */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Previstas para hoje
          </h2>
          {previstasHoje.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nada previsto para hoje.
            </p>
          ) : (
            <Card className="divide-y p-0">
              {previstasHoje.map((a) => {
                const v = veiculoPorId.get(a.veiculoId);
                const u = condutorDe(a);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 p-3.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {formatHora(a.inicio)} · {nomeVeiculo(v)}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {u?.nome ?? "—"}
                        {siglaSec(u) ? ` · ${siglaSec(u)}` : ""}
                      </div>
                    </div>
                    {u?.telefone && (
                      <TelefoneCopiavel telefone={u.telefone} compacto />
                    )}
                  </div>
                );
              })}
            </Card>
          )}
        </section>
      </div>

      {/* Histórico */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Histórico</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por placa, pessoa ou destino"
            className="pl-9"
          />
        </div>
        {historico.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {busca ? "Nada encontrado." : "Sem viagens concluídas ainda."}
          </p>
        ) : (
          <Card className="divide-y p-0">
            {historico.map((a) => {
              const v = veiculoPorId.get(a.veiculoId);
              const u = condutorDe(a);
              const kmRodados =
                a.kmSaida !== undefined && a.kmRetorno !== undefined
                  ? a.kmRetorno - a.kmSaida
                  : undefined;
              return (
                <div key={a.id} className="flex items-center justify-between gap-3 p-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {nomeVeiculo(v)}
                      {v?.placa && (
                        <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                          {v.placa}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {u?.nome ?? "—"}
                      {a.destino ? ` · ${a.destino}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <div>
                      {a.checkoutEm ? formatHora(a.checkoutEm) : formatHora(a.fim)}
                    </div>
                    {kmRodados !== undefined && (
                      <div className="inline-flex items-center gap-1 tabular-nums">
                        <Gauge className="size-3" />
                        {kmRodados.toLocaleString("pt-BR")} km
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}

function Contador({
  rotulo,
  valor,
  tom,
  icone,
}: {
  rotulo: string;
  valor: number;
  tom?: "rose" | "amber" | "emerald";
  icone?: React.ReactNode;
}) {
  const corValor =
    tom === "rose"
      ? "text-rose-600 dark:text-rose-400"
      : tom === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : tom === "emerald"
          ? "text-emerald-600 dark:text-emerald-400"
          : "";
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        tom === "rose"
          ? "border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10"
          : "bg-card",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs",
          tom === "rose" ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground",
        )}
      >
        {icone}
        {rotulo}
      </div>
      <div className={cn("mt-0.5 text-2xl font-semibold tabular-nums", corValor)}>
        {valor}
      </div>
    </div>
  );
}

/** Número de telefone selecionável + botão "copiar" com confirmação visual. */
function TelefoneCopiavel({
  telefone,
  destaque,
  compacto,
}: {
  telefone: string;
  destaque?: boolean;
  compacto?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const formatado = formatTelefone(telefone);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(formatado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sem permissão de clipboard: o `select-all` deixa copiar manualmente.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar número"
      aria-label={`Copiar telefone ${formatado}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-sm transition-colors",
        destaque
          ? "border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
          : "hover:bg-muted",
        compacto && "border-0 px-1.5 py-0.5 text-xs",
      )}
    >
      {copiado ? (
        <>
          <Check className="size-3.5 text-emerald-600" />
          <span className="text-emerald-600">copiado</span>
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          <span className="select-all tabular-nums">{formatado}</span>
        </>
      )}
    </button>
  );
}
