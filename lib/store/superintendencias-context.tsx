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
import type { Superintendencia } from "@/lib/mock/types";
import {
  listarSuperintendencias,
  removerSuperintendencia,
  upsertSuperintendencia,
} from "@/lib/data/frota";
import { notificarFalha } from "@/lib/notificacoes";

interface SuperintendenciasContextValue {
  superintendencias: Superintendencia[];
  carregando: boolean;
  buscarPorId: (id: string) => Superintendencia | undefined;
  /** Lista filtrada por secretaria. */
  porSecretaria: (secretariaId: string) => Superintendencia[];
  salvar: (s: Superintendencia) => void;
  remover: (id: string) => void;
}

const SuperintendenciasContext =
  createContext<SuperintendenciasContextValue | null>(null);

export function SuperintendenciasProvider({ children }: { children: ReactNode }) {
  const [superintendencias, setSuperintendencias] = useState<Superintendencia[]>(
    [],
  );
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    listarSuperintendencias()
      .then((lista) => {
        if (vivo) setSuperintendencias(lista);
      })
      .catch((e) => notificarFalha("Falha ao carregar superintendências", e))
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const buscarPorId = useCallback(
    (id: string) => superintendencias.find((s) => s.id === id),
    [superintendencias],
  );

  const porSecretaria = useCallback(
    (secretariaId: string) =>
      superintendencias.filter((s) => s.secretariaId === secretariaId),
    [superintendencias],
  );

  const salvar = useCallback((s: Superintendencia) => {
    setSuperintendencias((atual) => {
      const idx = atual.findIndex((x) => x.id === s.id);
      if (idx === -1) return [...atual, s];
      return atual.map((x, i) => (i === idx ? s : x));
    });
    upsertSuperintendencia(s).catch((e) =>
      notificarFalha("Falha ao salvar superintendência", e),
    );
  }, []);

  const remover = useCallback((id: string) => {
    setSuperintendencias((atual) => atual.filter((s) => s.id !== id));
    removerSuperintendencia(id).catch((e) =>
      notificarFalha("Falha ao remover superintendência", e),
    );
  }, []);

  const value = useMemo<SuperintendenciasContextValue>(
    () => ({
      superintendencias,
      carregando,
      buscarPorId,
      porSecretaria,
      salvar,
      remover,
    }),
    [superintendencias, carregando, buscarPorId, porSecretaria, salvar, remover],
  );

  return (
    <SuperintendenciasContext.Provider value={value}>
      {children}
    </SuperintendenciasContext.Provider>
  );
}

export function useSuperintendencias() {
  const ctx = useContext(SuperintendenciasContext);
  if (!ctx) {
    throw new Error(
      "useSuperintendencias precisa estar dentro de <SuperintendenciasProvider>",
    );
  }
  return ctx;
}
