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
import {
  listarAgendamentos,
  removerAgendamento,
  upsertAgendamento,
} from "@/lib/data/frota";
import { useVeiculos } from "./veiculos-context";

interface AgendamentosContextValue {
  agendamentos: Agendamento[];
  carregando: boolean;
  buscarPorId: (id: string) => Agendamento | undefined;
  criar: (a: Omit<Agendamento, "id" | "criadoEm">) => Agendamento;
  salvar: (a: Agendamento) => void;
  alterarStatus: (id: string, novo: StatusAgendamento) => void;
  remover: (id: string) => void;
}

const AgendamentosContext = createContext<AgendamentosContextValue | null>(null);

function persistir(a: Agendamento) {
  upsertAgendamento(a).catch((e) =>
    console.error("Falha ao salvar agendamento", e),
  );
}

export function AgendamentosProvider({ children }: { children: ReactNode }) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const { salvar: salvarVeiculo, veiculos } = useVeiculos();

  useEffect(() => {
    let vivo = true;
    listarAgendamentos()
      .then((lista) => {
        if (vivo) setAgendamentos(lista);
      })
      .catch((e) => console.error("Falha ao carregar agendamentos", e))
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Sincroniza o status do veículo com agendamentos em_andamento.
  // Manutenção/indisponível são preservados (status manuais).
  // (TODO Fase 2c: mover para um trigger no banco — assim não depende de
  // ter o app aberto e não há corrida entre abas/usuários.)
  useEffect(() => {
    if (carregando) return;
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
  }, [agendamentos, veiculos, carregando, salvarVeiculo]);

  const buscarPorId = useCallback(
    (id: string) => agendamentos.find((a) => a.id === id),
    [agendamentos],
  );

  const criar = useCallback((a: Omit<Agendamento, "id" | "criadoEm">) => {
    const novo: Agendamento = {
      ...a,
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      criadoEm: new Date().toISOString(),
    };
    setAgendamentos((atual) => [...atual, novo]);
    persistir(novo);
    return novo;
  }, []);

  const salvar = useCallback((a: Agendamento) => {
    setAgendamentos((atual) => {
      const idx = atual.findIndex((x) => x.id === a.id);
      if (idx === -1) return [...atual, a];
      return atual.map((x, i) => (i === idx ? a : x));
    });
    persistir(a);
  }, []);

  const alterarStatus = useCallback(
    (id: string, novo: StatusAgendamento) => {
      setAgendamentos((atual) => {
        const idx = atual.findIndex((a) => a.id === id);
        if (idx === -1) return atual;
        const atualizado = { ...atual[idx], status: novo };
        persistir(atualizado);
        return atual.map((a, i) => (i === idx ? atualizado : a));
      });
    },
    [],
  );

  const remover = useCallback((id: string) => {
    setAgendamentos((atual) => atual.filter((a) => a.id !== id));
    removerAgendamento(id).catch((e) =>
      console.error("Falha ao remover agendamento", e),
    );
  }, []);

  const value = useMemo<AgendamentosContextValue>(
    () => ({
      agendamentos,
      carregando,
      buscarPorId,
      criar,
      salvar,
      alterarStatus,
      remover,
    }),
    [agendamentos, carregando, buscarPorId, criar, salvar, alterarStatus, remover],
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
