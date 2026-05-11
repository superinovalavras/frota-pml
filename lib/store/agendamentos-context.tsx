"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Agendamento, StatusAgendamento } from "@/lib/mock/types";
import { gerarAgendamentosSeed } from "@/lib/mock/agendamentos";
import { useVeiculos } from "./veiculos-context";

const STORAGE_KEY = "frota-agendamentos-v2";
const STORAGE_KEY_LEGACY = "frota-agendamentos-v1";

interface AgendamentosContextValue {
  agendamentos: Agendamento[];
  buscarPorId: (id: string) => Agendamento | undefined;
  criar: (a: Omit<Agendamento, "id" | "criadoEm">) => Agendamento;
  salvar: (a: Agendamento) => void;
  alterarStatus: (id: string, novo: StatusAgendamento) => void;
  remover: (id: string) => void;
}

const AgendamentosContext = createContext<AgendamentosContextValue | null>(
  null,
);

/** Migra registros antigos (passageiros como número, sem dia todo, sem locais) */
function migrar(raw: unknown): Agendamento[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a: unknown): Agendamento | null => {
      if (!a || typeof a !== "object") return null;
      const o = a as Record<string, unknown>;
      if (!o.id || !o.veiculoId || !o.inicio || !o.fim) return null;
      return {
        id: String(o.id),
        veiculoId: String(o.veiculoId),
        solicitanteId: String(o.solicitanteId ?? ""),
        motoristaId:
          typeof o.motoristaId === "string" ? o.motoristaId : null,
        inicio: String(o.inicio),
        fim: String(o.fim),
        diaTodo: !!o.diaTodo,
        localPartida: typeof o.localPartida === "string" ? o.localPartida : "",
        localDevolucao:
          typeof o.localDevolucao === "string" ? o.localDevolucao : "",
        destino: String(o.destino ?? ""),
        finalidade: String(o.finalidade ?? ""),
        passageiros: Array.isArray(o.passageiros) ? (o.passageiros as never) : [],
        status: (o.status as StatusAgendamento) ?? "pendente",
        observacoes:
          typeof o.observacoes === "string" ? o.observacoes : undefined,
        criadoEm: String(o.criadoEm ?? new Date().toISOString()),
        checkinEm: typeof o.checkinEm === "string" ? o.checkinEm : undefined,
        kmSaida: typeof o.kmSaida === "number" ? o.kmSaida : undefined,
        fotoSaidaUrl:
          typeof o.fotoSaidaUrl === "string" ? o.fotoSaidaUrl : undefined,
        obsSaida: typeof o.obsSaida === "string" ? o.obsSaida : undefined,
        checkoutEm:
          typeof o.checkoutEm === "string" ? o.checkoutEm : undefined,
        kmRetorno: typeof o.kmRetorno === "number" ? o.kmRetorno : undefined,
        fotoRetornoUrl:
          typeof o.fotoRetornoUrl === "string" ? o.fotoRetornoUrl : undefined,
        obsRetorno:
          typeof o.obsRetorno === "string" ? o.obsRetorno : undefined,
      };
    })
    .filter((x): x is Agendamento => x !== null);
}

function lerLocal(): Agendamento[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return migrar(JSON.parse(raw));
    // Migração one-shot do storage antigo
    const legacy = window.localStorage.getItem(STORAGE_KEY_LEGACY);
    if (legacy) {
      const migrado = migrar(JSON.parse(legacy));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrado));
      return migrado;
    }
    return null;
  } catch {
    return null;
  }
}

function gravarLocal(v: Agendamento[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch (e) {
    console.error("Falha ao gravar agendamentos no localStorage", e);
  }
}

export function AgendamentosProvider({ children }: { children: ReactNode }) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const { salvar: salvarVeiculo, veiculos } = useVeiculos();

  useEffect(() => {
    const local = lerLocal();
    if (local) {
      setAgendamentos(local);
    } else {
      // Primeira visita — popula com agendamentos seed relativos a hoje.
      setAgendamentos(gerarAgendamentosSeed());
    }
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    gravarLocal(agendamentos);
  }, [agendamentos, hidratado]);

  // Sincroniza status do veículo com agendamentos em_andamento.
  // Manutenção/indisponivel são preservados (status manuais).
  useEffect(() => {
    if (!hidratado) return;
    const emUsoIds = new Set(
      agendamentos
        .filter((a) => a.status === "em_andamento")
        .map((a) => a.veiculoId),
    );
    for (const v of veiculos) {
      if (v.status === "manutencao" || v.status === "indisponivel") continue;
      if (emUsoIds.has(v.id) && v.status !== "em_uso") {
        salvarVeiculo({ ...v, status: "em_uso" });
      } else if (!emUsoIds.has(v.id) && v.status === "em_uso") {
        salvarVeiculo({ ...v, status: "disponivel" });
      }
    }
  }, [agendamentos, veiculos, hidratado, salvarVeiculo]);

  const buscarPorId = useCallback(
    (id: string) => agendamentos.find((a) => a.id === id),
    [agendamentos],
  );

  const criar = useCallback(
    (a: Omit<Agendamento, "id" | "criadoEm">) => {
      const novo: Agendamento = {
        ...a,
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        criadoEm: new Date().toISOString(),
      };
      setAgendamentos((atual) => [...atual, novo]);
      return novo;
    },
    [],
  );

  const salvar = useCallback((a: Agendamento) => {
    setAgendamentos((atual) => {
      const idx = atual.findIndex((x) => x.id === a.id);
      if (idx === -1) return [...atual, a];
      return atual.map((x, i) => (i === idx ? a : x));
    });
  }, []);

  const alterarStatus = useCallback((id: string, novo: StatusAgendamento) => {
    setAgendamentos((atual) =>
      atual.map((a) => (a.id === id ? { ...a, status: novo } : a)),
    );
  }, []);

  const remover = useCallback((id: string) => {
    setAgendamentos((atual) => atual.filter((a) => a.id !== id));
  }, []);

  const value = useMemo<AgendamentosContextValue>(
    () => ({
      agendamentos,
      buscarPorId,
      criar,
      salvar,
      alterarStatus,
      remover,
    }),
    [agendamentos, buscarPorId, criar, salvar, alterarStatus, remover],
  );

  return (
    <AgendamentosContext.Provider value={value}>
      {children}
    </AgendamentosContext.Provider>
  );
}

export function useAgendamentos() {
  const ctx = useContext(AgendamentosContext);
  if (!ctx) {
    throw new Error(
      "useAgendamentos precisa estar dentro de <AgendamentosProvider>",
    );
  }
  return ctx;
}
