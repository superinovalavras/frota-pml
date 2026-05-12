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
import type { Funcao } from "@/lib/mock/types";
import {
  listarFuncoes,
  removerFuncao,
  upsertFuncoes,
} from "@/lib/data/frota";

interface FuncoesContextValue {
  funcoes: Funcao[];
  carregando: boolean;
  /** Lista ordenada por hierarquia ascendente (1 = topo) */
  funcoesOrdenadas: Funcao[];
  buscarPorId: (id: string) => Funcao | undefined;
  salvar: (f: Funcao) => void;
  remover: (id: string) => void;
  /** Move uma função uma posição para cima na hierarquia */
  moverParaCima: (id: string) => void;
  /** Move uma função uma posição para baixo na hierarquia */
  moverParaBaixo: (id: string) => void;
}

const FuncoesContext = createContext<FuncoesContextValue | null>(null);

/** Reatribui hierarquia 1..N respeitando a ordem atual e mantendo Master no topo */
function compactarHierarquia(lista: Funcao[]): Funcao[] {
  const ordenadas = lista.slice().sort((a, b) => {
    if (a.ehMaster && !b.ehMaster) return -1;
    if (!a.ehMaster && b.ehMaster) return 1;
    return a.hierarquia - b.hierarquia;
  });
  return ordenadas.map((f, i) => ({ ...f, hierarquia: i + 1 }));
}

function persistir(lista: Funcao[]) {
  upsertFuncoes(lista).catch((e) => console.error("Falha ao salvar funções", e));
}

export function FuncoesProvider({ children }: { children: ReactNode }) {
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    listarFuncoes()
      .then((lista) => {
        if (vivo) setFuncoes(lista);
      })
      .catch((e) => console.error("Falha ao carregar funções", e))
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

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
      const nova =
        idx === -1 ? [...atual, f] : atual.map((x, i) => (i === idx ? f : x));
      const compacta = compactarHierarquia(nova);
      persistir(compacta);
      return compacta;
    });
  }, []);

  const remover = useCallback((id: string) => {
    setFuncoes((atual) => {
      const alvo = atual.find((x) => x.id === id);
      if (!alvo || alvo.sistema) return atual;
      const compacta = compactarHierarquia(atual.filter((x) => x.id !== id));
      removerFuncao(id)
        .then(() => persistir(compacta))
        .catch((e) => console.error("Falha ao remover função", e));
      return compacta;
    });
  }, []);

  const moverParaCima = useCallback((id: string) => {
    setFuncoes((atual) => {
      const ordenadas = atual.slice().sort((a, b) => a.hierarquia - b.hierarquia);
      const idx = ordenadas.findIndex((f) => f.id === id);
      if (idx <= 0) return atual;
      const acima = ordenadas[idx - 1];
      if (acima.ehMaster) return atual; // Master sempre no topo
      const nova = ordenadas.slice();
      nova[idx - 1] = ordenadas[idx];
      nova[idx] = acima;
      const compacta = compactarHierarquia(nova);
      persistir(compacta);
      return compacta;
    });
  }, []);

  const moverParaBaixo = useCallback((id: string) => {
    setFuncoes((atual) => {
      const ordenadas = atual.slice().sort((a, b) => a.hierarquia - b.hierarquia);
      const idx = ordenadas.findIndex((f) => f.id === id);
      if (idx === -1 || idx >= ordenadas.length - 1) return atual;
      const alvo = ordenadas[idx];
      if (alvo.ehMaster) return atual; // Master nunca sai do topo
      const nova = ordenadas.slice();
      nova[idx] = ordenadas[idx + 1];
      nova[idx + 1] = alvo;
      const compacta = compactarHierarquia(nova);
      persistir(compacta);
      return compacta;
    });
  }, []);

  const value = useMemo<FuncoesContextValue>(
    () => ({
      funcoes,
      carregando,
      funcoesOrdenadas,
      buscarPorId,
      salvar,
      remover,
      moverParaCima,
      moverParaBaixo,
    }),
    [
      funcoes,
      carregando,
      funcoesOrdenadas,
      buscarPorId,
      salvar,
      remover,
      moverParaCima,
      moverParaBaixo,
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
