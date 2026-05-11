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
import { veiculos as seed } from "@/lib/mock/veiculos";
import type { Veiculo } from "@/lib/mock/types";

const STORAGE_KEY = "frota-veiculos-v1";

interface VeiculosContextValue {
  veiculos: Veiculo[];
  salvar: (v: Veiculo) => void;
  remover: (id: string) => void;
  resetSeed: () => void;
}

const VeiculosContext = createContext<VeiculosContextValue | null>(null);

function lerLocal(): Veiculo[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Veiculo[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function gravarLocal(v: Veiculo[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch (e) {
    console.error("Falha ao gravar veículos no localStorage", e);
  }
}

export function VeiculosProvider({ children }: { children: ReactNode }) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>(seed);
  const [hidratado, setHidratado] = useState(false);

  // Hidratar do localStorage no mount (evita mismatch de SSR)
  useEffect(() => {
    const local = lerLocal();
    if (local) setVeiculos(local);
    setHidratado(true);
  }, []);

  // Persistir em toda mudança após hidratação
  useEffect(() => {
    if (!hidratado) return;
    gravarLocal(veiculos);
  }, [veiculos, hidratado]);

  const salvar = useCallback((v: Veiculo) => {
    setVeiculos((atual) => {
      const idx = atual.findIndex((x) => x.id === v.id);
      if (idx === -1) return [...atual, v];
      const copia = atual.slice();
      copia[idx] = v;
      return copia;
    });
  }, []);

  const remover = useCallback((id: string) => {
    setVeiculos((atual) => atual.filter((v) => v.id !== id));
  }, []);

  const resetSeed = useCallback(() => {
    setVeiculos(seed);
  }, []);

  const value = useMemo(
    () => ({ veiculos, salvar, remover, resetSeed }),
    [veiculos, salvar, remover, resetSeed],
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
