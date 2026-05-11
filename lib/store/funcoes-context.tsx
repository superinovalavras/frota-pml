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
import { funcoes as seed } from "@/lib/mock/funcoes";
import type { Funcao } from "@/lib/mock/types";

const STORAGE_KEY = "frota-funcoes-v1";

interface FuncoesContextValue {
  funcoes: Funcao[];
  /** Lista ordenada por hierarquia ascendente (1 = topo) */
  funcoesOrdenadas: Funcao[];
  buscarPorId: (id: string) => Funcao | undefined;
  salvar: (f: Funcao) => void;
  remover: (id: string) => void;
  /** Move uma função uma posição para cima na hierarquia */
  moverParaCima: (id: string) => void;
  /** Move uma função uma posição para baixo na hierarquia */
  moverParaBaixo: (id: string) => void;
  resetSeed: () => void;
}

const FuncoesContext = createContext<FuncoesContextValue | null>(null);

function lerLocal(): Funcao[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Funcao[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function gravarLocal(v: Funcao[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch (e) {
    console.error("Falha ao gravar funcoes no localStorage", e);
  }
}

/** Reatribui hierarquia 1..N respeitando a ordem atual e mantendo Master no topo */
function compactarHierarquia(lista: Funcao[]): Funcao[] {
  const ordenadas = lista
    .slice()
    .sort((a, b) => {
      if (a.ehMaster && !b.ehMaster) return -1;
      if (!a.ehMaster && b.ehMaster) return 1;
      return a.hierarquia - b.hierarquia;
    });
  return ordenadas.map((f, i) => ({ ...f, hierarquia: i + 1 }));
}

export function FuncoesProvider({ children }: { children: ReactNode }) {
  const [funcoes, setFuncoes] = useState<Funcao[]>(seed);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    const local = lerLocal();
    if (local) setFuncoes(local);
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    gravarLocal(funcoes);
  }, [funcoes, hidratado]);

  const funcoesOrdenadas = useMemo(
    () => funcoes.slice().sort((a, b) => a.hierarquia - b.hierarquia),
    [funcoes],
  );

  const buscarPorId = useCallback(
    (id: string) => funcoes.find((f) => f.id === id),
    [funcoes],
  );

  const salvar = useCallback((f: Funcao) => {
    setFuncoes((atual) => {
      const idx = atual.findIndex((x) => x.id === f.id);
      const nova = idx === -1 ? [...atual, f] : atual.map((x, i) => (i === idx ? f : x));
      return compactarHierarquia(nova);
    });
  }, []);

  const remover = useCallback((id: string) => {
    setFuncoes((atual) => {
      const alvo = atual.find((x) => x.id === id);
      if (!alvo || alvo.sistema) return atual;
      return compactarHierarquia(atual.filter((x) => x.id !== id));
    });
  }, []);

  const moverParaCima = useCallback((id: string) => {
    setFuncoes((atual) => {
      const ordenadas = atual.slice().sort((a, b) => a.hierarquia - b.hierarquia);
      const idx = ordenadas.findIndex((f) => f.id === id);
      if (idx <= 0) return atual;
      const acima = ordenadas[idx - 1];
      // Master sempre no topo: se o vizinho de cima é Master, não permite trocar
      if (acima.ehMaster) return atual;
      const nova = ordenadas.slice();
      nova[idx - 1] = ordenadas[idx];
      nova[idx] = acima;
      return compactarHierarquia(nova);
    });
  }, []);

  const moverParaBaixo = useCallback((id: string) => {
    setFuncoes((atual) => {
      const ordenadas = atual.slice().sort((a, b) => a.hierarquia - b.hierarquia);
      const idx = ordenadas.findIndex((f) => f.id === id);
      if (idx === -1 || idx >= ordenadas.length - 1) return atual;
      const alvo = ordenadas[idx];
      // Master nunca sai do topo
      if (alvo.ehMaster) return atual;
      const nova = ordenadas.slice();
      nova[idx] = ordenadas[idx + 1];
      nova[idx + 1] = alvo;
      return compactarHierarquia(nova);
    });
  }, []);

  const resetSeed = useCallback(() => {
    setFuncoes(seed);
  }, []);

  const value = useMemo<FuncoesContextValue>(
    () => ({
      funcoes,
      funcoesOrdenadas,
      buscarPorId,
      salvar,
      remover,
      moverParaCima,
      moverParaBaixo,
      resetSeed,
    }),
    [
      funcoes,
      funcoesOrdenadas,
      buscarPorId,
      salvar,
      remover,
      moverParaCima,
      moverParaBaixo,
      resetSeed,
    ],
  );

  return (
    <FuncoesContext.Provider value={value}>{children}</FuncoesContext.Provider>
  );
}

export function useFuncoes() {
  const ctx = useContext(FuncoesContext);
  if (!ctx) {
    throw new Error("useFuncoes precisa estar dentro de <FuncoesProvider>");
  }
  return ctx;
}
