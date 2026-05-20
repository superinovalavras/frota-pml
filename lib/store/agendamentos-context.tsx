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
  /**
   * Cria uma nova reserva. Resolve quando a persistência no Supabase
   * terminou — útil para quem precisa do id em chamadas subsequentes
   * (ex.: notificar passageiros).
   */
  criar: (a: Omit<Agendamento, "id" | "criadoEm">) => Promise<Agendamento>;
  /** Atualiza uma reserva. Resolve quando o write terminou. */
  salvar: (a: Agendamento) => Promise<void>;
  alterarStatus: (id: string, novo: StatusAgendamento) => void;
  /**
   * Cancela uma reserva via server (que enfileira emails para envolvidos).
   * Use no lugar de `alterarStatus(id, "cancelado")` quando quiser informar
   * um motivo — `alterarStatus` com "cancelado" delega para este método
   * automaticamente, sem motivo.
   */
  cancelar: (id: string, motivo?: string) => Promise<void>;
  remover: (id: string) => void;
  /** Re-busca a lista do banco — útil após mutações server-side
   *  (ex.: cancelamento em massa em /api/manutencao). */
  recarregar: () => Promise<void>;
}

const AgendamentosContext = createContext<AgendamentosContextValue | null>(null);

async function persistir(a: Agendamento): Promise<void> {
  try {
    await upsertAgendamento(a);
  } catch (e) {
    console.error("Falha ao salvar agendamento", e);
  }
}

async function cancelarNoServidor(id: string, motivo?: string): Promise<void> {
  const resp = await fetch("/api/agendamento/cancelar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, motivo }),
  });
  if (!resp.ok) {
    const json = (await resp.json().catch(() => ({}))) as { erro?: string };
    throw new Error(json.erro ?? `HTTP ${resp.status}`);
  }
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

  const criar = useCallback(
    async (a: Omit<Agendamento, "id" | "criadoEm">) => {
      const novo: Agendamento = {
        ...a,
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        criadoEm: new Date().toISOString(),
      };
      setAgendamentos((atual) => [...atual, novo]);
      await persistir(novo);
      return novo;
    },
    [],
  );

  const salvar = useCallback(async (a: Agendamento) => {
    setAgendamentos((atual) => {
      const idx = atual.findIndex((x) => x.id === a.id);
      if (idx === -1) return [...atual, a];
      return atual.map((x, i) => (i === idx ? a : x));
    });
    await persistir(a);
  }, []);

  const recarregar = useCallback(async () => {
    try {
      const lista = await listarAgendamentos();
      setAgendamentos(lista);
    } catch (e) {
      console.error("Falha ao recarregar agendamentos", e);
    }
  }, []);

  const cancelar = useCallback(
    async (id: string, motivo?: string) => {
      // Otimismo: marca como cancelado no estado antes de responder. Se o
      // servidor recusar, recarrega para reconciliar.
      setAgendamentos((atual) =>
        atual.map((a) => (a.id === id ? { ...a, status: "cancelado" } : a)),
      );
      try {
        await cancelarNoServidor(id, motivo);
      } catch (e) {
        console.error("Falha ao cancelar reserva", e);
        await recarregar();
        throw e;
      }
    },
    [recarregar],
  );

  const alterarStatus = useCallback(
    (id: string, novo: StatusAgendamento) => {
      // Cancelamento passa pelo servidor (atualiza DB + enfileira emails).
      if (novo === "cancelado") {
        cancelar(id).catch(() => {
          /* já logado em cancelar() */
        });
        return;
      }
      setAgendamentos((atual) => {
        const idx = atual.findIndex((a) => a.id === id);
        if (idx === -1) return atual;
        const atualizado = { ...atual[idx], status: novo };
        persistir(atualizado);
        return atual.map((a, i) => (i === idx ? atualizado : a));
      });
    },
    [cancelar],
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
      cancelar,
      remover,
      recarregar,
    }),
    [
      agendamentos,
      carregando,
      buscarPorId,
      criar,
      salvar,
      alterarStatus,
      cancelar,
      remover,
      recarregar,
    ],
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
