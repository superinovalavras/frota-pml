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
import { notificarArmazenamentoCheio } from "@/lib/storage-aviso";

const STORAGE_KEY = "frota-branding-v1";

interface BrandingContextValue {
  /** Data URL da logo customizada, ou null para usar a logo padrão. */
  logoUrl: string | null;
  /** Define (data URL) ou limpa (null) a logo customizada. */
  setLogo: (dataUrl: string | null) => void;
  hidratado: boolean;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

function lerLocal(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { logoUrl?: unknown };
    return typeof parsed.logoUrl === "string" ? parsed.logoUrl : null;
  } catch {
    return null;
  }
}

function gravarLocal(logoUrl: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ logoUrl }));
  } catch (e) {
    console.error("Falha ao gravar branding no localStorage", e);
    notificarArmazenamentoCheio();
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    setLogoUrl(lerLocal());
    setHidratado(true);
  }, []);

  const setLogo = useCallback((dataUrl: string | null) => {
    setLogoUrl(dataUrl);
    gravarLocal(dataUrl);
  }, []);

  const value = useMemo<BrandingContextValue>(
    () => ({ logoUrl, setLogo, hidratado }),
    [logoUrl, setLogo, hidratado],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    // Fallback no-op caso o provider falte em alguma rota.
    return { logoUrl: null, setLogo: () => {}, hidratado: true };
  }
  return ctx;
}
