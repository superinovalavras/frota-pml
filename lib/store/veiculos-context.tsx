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
import type { Veiculo } from "@/lib/mock/types";
import {
  listarVeiculos,
  removerVeiculo,
  upsertVeiculo,
} from "@/lib/data/frota";
import { notificarFalha } from "@/lib/notificacoes";

interface VeiculosContextValue {
  veiculos: Veiculo[];
  carregando: boolean;
  salvar: (v: Veiculo) => void;
  remover: (id: string) => void;
  /** Re-busca a lista do banco — útil após operações server-side
   *  (ex.: rota /api/manutencao) que alteram dados sem passar pelo `salvar`. */
  recarregar: () => Promise<void>;
}

const VeiculosContext = createContext<VeiculosContextValue | null>(null);

export function VeiculosProvider({ children }: { children: ReactNode }) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    listarVeiculos()
      .then((lista) => {
        if (vivo) setVeiculos(lista);
      })
      .catch((e) => notificarFalha("Falha ao carregar veículos", e))
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const salvar = useCallback((v: Veiculo) => {
    setVeiculos((atual) => {
      const idx = atual.findIndex((x) => x.id === v.id);
      if (idx === -1) return [...atual, v];
      const copia = atual.slice();
      copia[idx] = v;
      return copia;
    });
    upsertVeiculo(v).catch((e) => notificarFalha("Falha ao salvar veículo", e));
  }, []);

  const remover = useCallback((id: string) => {
    setVeiculos((atual) => atual.filter((v) => v.id !== id));
    removerVeiculo(id).catch((e) => notificarFalha("Falha ao remover veículo", e));
  }, []);

  const recarregar = useCallback(async () => {
    try {
      const lista = await listarVeiculos();
      setVeiculos(lista);
    } catch (e) {
      notificarFalha("Falha ao recarregar veículos", e);
    }
  }, []);

  const value = useMemo(
    () => ({ veiculos, carregando, salvar, remover, recarregar }),
    [veiculos, carregando, salvar, remover, recarregar],
  );

  return (
    <VeiculosContext.Provider value={value}>
      {children}
    </VeiculosContext.Provider>
  );
}

export function useVeiculos() {
  const ctx = useContext(VeiculosContext);
  if (!ctx) {
    throw new Error("useVeiculos precisa estar dentro de <VeiculosProvider>");
  }
  return ctx;
}
