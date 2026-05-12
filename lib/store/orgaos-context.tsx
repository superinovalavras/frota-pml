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
import type { Secretaria } from "@/lib/mock/types";
import {
  listarSecretarias,
  removerSecretaria,
  upsertSecretaria,
} from "@/lib/data/frota";

interface OrgaosContextValue {
  orgaos: Secretaria[];
  carregando: boolean;
  buscarPorId: (id: string) => Secretaria | undefined;
  salvar: (o: Secretaria) => void;
  remover: (id: string) => void;
}

const OrgaosContext = createContext<OrgaosContextValue | null>(null);

export function OrgaosProvider({ children }: { children: ReactNode }) {
  const [orgaos, setOrgaos] = useState<Secretaria[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    listarSecretarias()
      .then((lista) => {
        if (vivo) setOrgaos(lista);
      })
      .catch((e) => console.error("Falha ao carregar órgãos", e))
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const buscarPorId = useCallback(
    (id: string) => orgaos.find((o) => o.id === id),
    [orgaos],
  );

  const salvar = useCallback((o: Secretaria) => {
    setOrgaos((atual) => {
      const idx = atual.findIndex((x) => x.id === o.id);
      if (idx === -1) return [...atual, o];
      return atual.map((x, i) => (i === idx ? o : x));
    });
    upsertSecretaria(o).catch((e) => console.error("Falha ao salvar órgão", e));
  }, []);

  const remover = useCallback((id: string) => {
    setOrgaos((atual) => atual.filter((o) => o.id !== id));
    removerSecretaria(id).catch((e) => console.error("Falha ao remover órgão", e));
  }, []);

  const value = useMemo<OrgaosContextValue>(
    () => ({ orgaos, carregando, buscarPorId, salvar, remover }),
    [orgaos, carregando, buscarPorId, salvar, remover],
  );

  return (
    <OrgaosContext.Provider value={value}>{children}</OrgaosContext.Provider>
  );
}

export function useOrgaos() {
  const ctx = useContext(OrgaosContext);
  if (!ctx) {
    throw new Error("useOrgaos precisa estar dentro de <OrgaosProvider>");
  }
  return ctx;
}
