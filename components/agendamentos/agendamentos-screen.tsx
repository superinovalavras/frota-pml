"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Calendar,
  Car,
  IdCard,
  Filter,
  Sun,
  Users,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { usePerfil } from "@/lib/perfil-context";
import { filtrarVeiculosVisiveis } from "@/lib/visibilidade";
import { formatHora, formatDataCurta } from "@/lib/formatters";
import { formatDuracao } from "@/lib/agendamento-utils";
import { StatusBadge } from "@/components/agenda/status-badge";
import { AgendamentoForm } from "./agendamento-form";
import { AgendamentoDetalhe } from "@/components/agenda/agendamento-detalhe";
import type { Agendamento } from "@/lib/mock/types";

const STATUS_FILTROS: { valor: string; label: string }[] = [
  { valor: "todos", label: "Todos os status" },
  { valor: "pendente", label: "Pendentes" },
  { valor: "confirmado", label: "Confirmados" },
  { valor: "em_andamento", label: "Em andamento" },
  { valor: "concluido", label: "Concluídos" },
  { valor: "cancelado", label: "Cancelados" },
];

const ESCOPOS: { valor: string; label: string }[] = [
  { valor: "todos", label: "Todas as reservas" },
  { valor: "minhas", label: "Minhas reservas" },
  { valor: "como_motorista", label: "Onde sou motorista" },
];

export function AgendamentosScreen() {
  const { agendamentos } = useAgendamentos();
  const { veiculos } = useVeiculos();
  const { buscarPorId: buscarUsuario } = useUsuarios();
  const { usuario } = usePerfil();

  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Agendamento | null>(null);
  const [detalhe, setDetalhe] = useState<Agendamento | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroEscopo, setFiltroEscopo] = useState<string>("todos");
  const [busca, setBusca] = useState<string>("");

  const veiculosVisiveis = useMemo(
    () => filtrarVeiculosVisiveis(veiculos, usuario),
    [veiculos, usuario],
  );

  const filtrados = useMemo(() => {
    const idsVisiveis = new Set(veiculosVisiveis.map((v) => v.id));
    // Inclui reservas onde sou solicitante/motorista mesmo que o veículo seja
    // de outra secretaria (motorista designado para carro de outra área).
    let lista = agendamentos.filter(
      (a) =>
        idsVisiveis.has(a.veiculoId) ||
        a.solicitanteId === usuario.id ||
        a.motoristaId === usuario.id,
    );

    if (filtroStatus !== "todos") {
      lista = lista.filter((a) => a.status === filtroStatus);
    }
    if (filtroEscopo === "minhas") {
      lista = lista.filter((a) => a.solicitanteId === usuario.id);
    } else if (filtroEscopo === "como_motorista") {
      lista = lista.filter((a) => a.motoristaId === usuario.id);
    }
    const termo = busca.trim().toLowerCase();
    if (termo) {
      lista = lista.filter((a) =>
        [a.destino, a.finalidade, a.observacoes ?? ""].some((v) =>
          v.toLowerCase().includes(termo),
        ),
      );
    }
    return lista.sort(
      (a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime(),
    );
  }, [agendamentos, veiculosVisiveis, filtroStatus, filtroEscopo, busca, usuario.id]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">
            Lista detalhada de reservas. Use os filtros para focar no que
            importa.
          </p>
        </div>
        <Button onClick={() => setCriando(true)}>
          <Plus className="size-4" />
          Novo agendamento
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar destino, finalidade…"
            className="pl-8"
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[170px]">
            <Filter className="size-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTROS.map((s) => (
              <SelectItem key={s.valor} value={s.valor}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroEscopo} onValueChange={setFiltroEscopo}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESCOPOS.map((s) => (
              <SelectItem key={s.valor} value={s.valor}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Nenhum agendamento encontrado.
          </div>
        ) : (
          <ul className="divide-y">
            {filtrados.map((a) => {
              const veiculo = veiculos.find((v) => v.id === a.veiculoId);
              const solicitante = buscarUsuario(a.solicitanteId);
              const motorista = a.motoristaId
                ? buscarUsuario(a.motoristaId)
                : null;
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setDetalhe(a)}
                >
                  <div className="flex flex-col items-center justify-center size-14 rounded-md bg-primary/5 text-primary shrink-0 relative">
                    <span className="text-[10px] uppercase font-semibold">
                      {new Date(a.inicio).toLocaleDateString("pt-BR", {
                        month: "short",
                      }).replace(".", "")}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {new Date(a.inicio).getDate().toString().padStart(2, "0")}
                    </span>
                    {a.diaTodo && (
                      <Sun className="absolute -top-1 -right-1 size-4 bg-background text-primary rounded-full p-0.5 ring-1 ring-primary/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{a.destino}</span>
                      <StatusBadge status={a.status} />
                      {a.diaTodo && (
                        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                          <Sun className="size-3" /> dia todo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDataCurta(new Date(a.inicio))}
                        {!a.diaTodo &&
                          ` · ${formatHora(a.inicio)}–${formatHora(a.fim)} (${formatDuracao(a.inicio, a.fim)})`}
                      </span>
                      {veiculo && (
                        <span className="flex items-center gap-1">
                          <Car className="size-3" />
                          {veiculo.placa}
                        </span>
                      )}
                      {motorista && (
                        <span className="flex items-center gap-1">
                          <IdCard className="size-3" />
                          {motorista.nome}
                        </span>
                      )}
                      {a.passageiros && a.passageiros.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {a.passageiros.length} passageiro
                          {a.passageiros.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {a.localPartida && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="size-3" />
                          <span className="truncate">{a.localPartida}</span>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                      {a.finalidade}
                      {solicitante
                        ? ` · solicitado por ${solicitante.nome}`
                        : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <AgendamentoForm
        aberto={criando || editando !== null}
        agendamento={editando}
        onClose={() => {
          setCriando(false);
          setEditando(null);
        }}
      />

      <AgendamentoDetalhe
        agendamento={detalhe}
        onClose={() => setDetalhe(null)}
        onEditar={(a) => {
          setDetalhe(null);
          setEditando(a);
        }}
      />
    </div>
  );
}
