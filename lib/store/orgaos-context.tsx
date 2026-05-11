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
import { secretarias as seed } from "@/lib/mock/secretarias";
import type { Secretaria } from "@/lib/mock/types";

const STORAGE_KEY = "frota-orgaos-v1";

interface OrgaosContextValue {
  orgaos: Secretaria[];
  buscarPorId: (id: string) => Secretaria | undefined;
  salvar: (o: Secretaria) => void;
  remover: (id: string) => void;
}

const OrgaosContext = createContext<OrgaosContextValue | null>(null);

function lerLocal(): Secretaria[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Secretaria[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function gravarLocal(v: Secretaria[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch (e) {
    console.error("Falha ao gravar orgaos no localStorage", e);
  }
}

export function OrgaosProvider({ children }: { children: ReactNode }) {
  const [orgaos, setOrgaos] = useState<Secretaria[]>(seed);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    const local = lerLocal();
    if (local) setOrgaos(local);
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    gravarLocal(orgaos);
  }, [orgaos, hidratado]);

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
  }, []);

  const remover = useCallback((id: string) => {
    setOrgaos((atual) => atual.filter((o) => o.id !== id));
  }, []);

  const value = useMemo<OrgaosContextValue>(
    () => ({ orgaos, buscarPorId, salvar, remover }),
    [orgaos, buscarPorId, salvar, remover],
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
