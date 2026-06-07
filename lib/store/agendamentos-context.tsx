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
import { notificarFalha } from "@/lib/notificacoes";

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

/**
 * Grava no Supabase. Propaga o erro pro chamador (que decide se mostra na
 * UI inline ou via toast) — `criar`/`salvar` reverte o estado local em
 * caso de falha pra evitar o cenário "id existe na tela mas não no banco".
 */
async function persistir(a: Agendamento): Promise<void> {
  await upsertAgendamento(a);
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

  useEffect(() => {
    let vivo = true;
    listarAgendamentos()
      .then((lista) => {
        if (vivo) setAgendamentos(lista);
      })
      .catch((e) => notificarFalha("Falha ao carregar agendamentos", e))
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  // A sincronia de `veiculos.status` (em_uso/disponivel) com os agendamentos
  // em_andamento agora é feita por TRIGGER no banco (migration 0003) — assim
  // não depende do app aberto e funciona sob RLS (o cliente não escreve em
  // veiculos). Idem o KM no check-out (trigger da migration 0004).

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
      try {
        await persistir(novo);
      } catch (e) {
        // Reverte o otimismo — sem isso a UI mostra um id que o banco
        // nunca recebeu, e chamadas subsequentes (ex.: notificar-passageiros)
        // batem em 404.
        setAgendamentos((atual) => atual.filter((x) => x.id !== novo.id));
        notificarFalha("Falha ao criar agendamento", e);
        throw e;
      }
      return novo;
    },
    [],
  );

  const salvar = useCallback(async (a: Agendamento) => {
    let anterior: Agendamento | null = null;
    setAgendamentos((atual) => {
      const idx = atual.findIndex((x) => x.id === a.id);
      if (idx === -1) return [...atual, a];
      anterior = atual[idx];
      return atual.map((x, i) => (i === idx ? a : x));
    });
    try {
      await persistir(a);
    } catch (e) {
      // Reverte pro estado anterior (se existia) ou remove (se era insert).
      setAgendamentos((atual) => {
        if (anterior) {
          return atual.map((x) => (x.id === a.id ? anterior! : x));
        }
        return atual.filter((x) => x.id !== a.id);
      });
      notificarFalha("Falha ao salvar agendamento", e);
      throw e;
    }
  }, []);

  const recarregar = useCallback(async () => {
    try {
      const lista = await listarAgendamentos();
      setAgendamentos(lista);
    } catch (e) {
      notificarFalha("Falha ao recarregar agendamentos", e);
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
        notificarFalha("Falha ao cancelar reserva", e);
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
        const anterior = atual[idx];
        persistir(atualizado).catch((e) => {
          notificarFalha(`Falha ao atualizar status (${novo})`, e);
          // Reverte pro estado anterior; o usuário enxerga o toast e o
          // status volta ao que era.
          setAgendamentos((cur) =>
            cur.map((x) => (x.id === id ? anterior : x)),
          );
        });
        return atual.map((a, i) => (i === idx ? atualizado : a));
      });
    },
    [cancelar],
  );

  const remover = useCallback((id: string) => {
    setAgendamentos((atual) => atual.filter((a) => a.id !== id));
    removerAgendamento(id).catch((e) =>
      notificarFalha("Falha ao remover agendamento", e),
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
