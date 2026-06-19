"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  Clock,
  TrendingUp,
  Car,
  MapPin,
  Users,
  Gauge,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgendamentos } from "@/lib/store/agendamentos-context";
import { useVeiculos } from "@/lib/store/veiculos-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { usePerfil } from "@/lib/perfil-context";
import { filtrarVeiculosVisiveis } from "@/lib/visibilidade";
import { rotuloStatusAgendamento } from "@/lib/formatters";
import type { StatusAgendamento } from "@/lib/mock/types";

const TODOS = "todos";

export function RelatoriosScreen() {
  const { agendamentos } = useAgendamentos();
  const { veiculos } = useVeiculos();
  const { buscarPorId: buscarUsuario, usuarios } = useUsuarios();
  const { orgaos } = useOrgaos();
  const { usuario } = usePerfil();

  const [filtroVeiculo, setFiltroVeiculo] = useState(TODOS);
  const [filtroUsuario, setFiltroUsuario] = useState(TODOS);
  const [filtroOrgao, setFiltroOrgao] = useState(TODOS);

  const visiveis = useMemo(
    () => filtrarVeiculosVisiveis(veiculos, usuario),
    [veiculos, usuario],
  );
  const idsVisiveis = useMemo(
    () => new Set(visiveis.map((v) => v.id)),
    [visiveis],
  );
  const ags = useMemo(() => {
    return agendamentos.filter((a) => {
      if (!idsVisiveis.has(a.veiculoId)) return false;
      if (filtroVeiculo !== TODOS && a.veiculoId !== filtroVeiculo) return false;
      if (
        filtroUsuario !== TODOS &&
        a.solicitanteId !== filtroUsuario &&
        a.motoristaId !== filtroUsuario
      ) {
        return false;
      }
      if (filtroOrgao !== TODOS) {
        const v = veiculos.find((x) => x.id === a.veiculoId);
        if (!v || v.secretariaId !== filtroOrgao) return false;
      }
      return true;
    });
  }, [
    agendamentos,
    idsVisiveis,
    veiculos,
    filtroVeiculo,
    filtroUsuario,
    filtroOrgao,
  ]);

  const usuariosOrdenados = useMemo(
    () =>
      usuarios.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [usuarios],
  );

  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();
  const noMes = ags.filter((a) => {
    const d = new Date(a.inicio);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  const concluidos = ags.filter((a) => a.status === "concluido");
  const ativosOuConfirmados = ags.filter(
    (a) =>
      a.status === "confirmado" ||
      a.status === "em_andamento" ||
      a.status === "pendente",
  );

  const horasReservadas = ags.reduce((tot, a) => {
    const h =
      (new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 3600000;
    return tot + Math.max(0, h);
  }, 0);

  const horasMes = noMes.reduce((tot, a) => {
    const h =
      (new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 3600000;
    return tot + Math.max(0, h);
  }, 0);

  // Km rodados (derivado de check-in/out registrado)
  const somarKm = (lista: typeof ags) =>
    lista.reduce((tot, a) => {
      if (a.kmSaida === undefined || a.kmRetorno === undefined) return tot;
      return tot + Math.max(0, a.kmRetorno - a.kmSaida);
    }, 0);
  const kmRodadosMes = somarKm(noMes);
  const kmRodadosTotal = somarKm(ags);

  // Distribuição por status
  const statusList: StatusAgendamento[] = [
    "pendente",
    "confirmado",
    "em_andamento",
    "concluido",
    "cancelado",
    "substituido",
  ];
  const porStatus = statusList.map((s) => ({
    status: s,
    qtd: ags.filter((a) => a.status === s).length,
  }));
  const maxStatus = Math.max(1, ...porStatus.map((s) => s.qtd));

  // Top veículos
  const usoVeiculo = new Map<string, number>();
  for (const a of ags) {
    usoVeiculo.set(a.veiculoId, (usoVeiculo.get(a.veiculoId) ?? 0) + 1);
  }
  const topVeiculos = Array.from(usoVeiculo.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([vid, qtd]) => ({
      veiculo: veiculos.find((v) => v.id === vid),
      qtd,
    }));
  const maxVeiculo = Math.max(1, ...topVeiculos.map((v) => v.qtd));

  // Top destinos
  const destinos = new Map<string, number>();
  for (const a of ags) {
    const k = a.destino.trim() || "—";
    destinos.set(k, (destinos.get(k) ?? 0) + 1);
  }
  const topDestinos = Array.from(destinos.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxDestino = Math.max(1, ...topDestinos.map(([, q]) => q));

  // Top solicitantes
  const solics = new Map<string, number>();
  for (const a of ags) {
    solics.set(a.solicitanteId, (solics.get(a.solicitanteId) ?? 0) + 1);
  }
  const topSolicitantes = Array.from(solics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([uid, qtd]) => ({ usuario: buscarUsuario(uid), qtd }));
  const maxSolic = Math.max(1, ...topSolicitantes.map((s) => s.qtd));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Visão analítica da frota — escopo limitado aos veículos visíveis ao
          seu perfil.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="size-4" />
          Filtrar:
        </span>
        <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os veículos</SelectItem>
            {visiveis.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.placa} — {v.modelo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os usuários</SelectItem>
            {usuariosOrdenados.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroOrgao} onValueChange={setFiltroOrgao}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os órgãos</SelectItem>
            {orgaos.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.sigla} — {o.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <Kpi
          icon={CalendarCheck}
          label="Reservas no mês"
          valor={noMes.length}
          sub={`${ags.length} no total`}
        />
        <Kpi
          icon={Clock}
          label="Horas reservadas no mês"
          valor={`${horasMes.toFixed(1)}h`}
          sub={`${horasReservadas.toFixed(1)}h acumulado`}
        />
        <Kpi
          icon={TrendingUp}
          label="Concluídas"
          valor={concluidos.length}
          sub={`${ativosOuConfirmados.length} ativas`}
        />
        <Kpi
          icon={Car}
          label="Veículos da frota"
          valor={visiveis.length}
          sub={`${visiveis.filter((v) => v.status === "em_uso").length} em uso`}
        />
        <Kpi
          icon={Gauge}
          label="Km rodados no mês"
          valor={`${kmRodadosMes.toLocaleString("pt-BR")} km`}
          sub={`${kmRodadosTotal.toLocaleString("pt-BR")} km acumulado`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status distribution */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Reservas por status</h3>
            <ul className="space-y-3">
              {porStatus.map((s) => (
                <li key={s.status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{rotuloStatusAgendamento(s.status)}</span>
                    <span className="font-mono text-muted-foreground">
                      {s.qtd}
                    </span>
                  </div>
                  <Barra
                    porcentagem={(s.qtd / maxStatus) * 100}
                    cor={corPorStatus(s.status)}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Top veículos */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Car className="size-4" />
              Veículos mais reservados
            </h3>
            {topVeiculos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem reservas registradas.
              </p>
            ) : (
              <ul className="space-y-3">
                {topVeiculos.map((v, i) => (
                  <li key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">
                        {v.veiculo
                          ? `${[v.veiculo.marca, v.veiculo.modelo]
                              .filter(Boolean)
                              .join(" ")} · ${v.veiculo.placa}`
                          : "Veículo removido"}
                      </span>
                      <Badge variant="secondary" className="font-mono">
                        {v.qtd}
                      </Badge>
                    </div>
                    <Barra
                      porcentagem={(v.qtd / maxVeiculo) * 100}
                      cor="bg-primary"
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top destinos */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MapPin className="size-4" />
              Destinos mais frequentes
            </h3>
            {topDestinos.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-3">
                {topDestinos.map(([dest, qtd]) => (
                  <li key={dest} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{dest}</span>
                      <Badge variant="secondary" className="font-mono">
                        {qtd}
                      </Badge>
                    </div>
                    <Barra
                      porcentagem={(qtd / maxDestino) * 100}
                      cor="bg-amber-400"
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top solicitantes */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="size-4" />
              Maiores solicitantes
            </h3>
            {topSolicitantes.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-3">
                {topSolicitantes.map((s, i) => (
                  <li key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">
                        {s.usuario?.nome ?? "Usuário removido"}
                      </span>
                      <Badge variant="secondary" className="font-mono">
                        {s.qtd}
                      </Badge>
                    </div>
                    <Barra
                      porcentagem={(s.qtd / maxSolic) * 100}
                      cor="bg-sky-500"
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  valor,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valor: number | string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-semibold leading-tight mt-1">
              {valor}
            </p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Barra({ porcentagem, cor }: { porcentagem: number; cor: string }) {
  return (
    <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
      <div
        className={`h-full ${cor} transition-all`}
        style={{ width: `${Math.max(2, porcentagem)}%` }}
      />
    </div>
  );
}

function corPorStatus(s: StatusAgendamento): string {
  const m: Record<StatusAgendamento, string> = {
    pendente: "bg-amber-400",
    confirmado: "bg-sky-500",
    em_andamento: "bg-emerald-500",
    concluido: "bg-zinc-400",
    cancelado: "bg-rose-400",
    substituido: "bg-violet-400",
  };
  return m[s];
}
