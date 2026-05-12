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
import { lerLogoUrl, gravarLogoUrl } from "@/lib/data/configuracoes";

const STORAGE_KEY = "frota-branding-v1";

interface BrandingContextValue {
  /** URL da logo personalizada (Supabase Storage), ou null para a padrão. */
  logoUrl: string | null;
  /** Define ou limpa (null) a logo. */
  setLogo: (url: string | null) => void;
  hidratado: boolean;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

// --- cache local (resiliência enquanto a migration 0002 não está aplicada) ---
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
  } catch {
    /* ignore */
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    let vivo = true;
    lerLogoUrl()
      .then((url) => {
        if (vivo) setLogoUrl(url);
      })
      .catch(() => {
        // Tabela `configuracoes` ainda não existe → usa o cache local.
        if (vivo) setLogoUrl(lerLocal());
      })
      .finally(() => {
        if (vivo) setHidratado(true);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const setLogo = useCallback((url: string | null) => {
    setLogoUrl(url);
    gravarLocal(url);
    gravarLogoUrl(url).catch((e) => console.error("Falha ao salvar logo", e));
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
    return { logoUrl: null, setLogo: () => {}, hidratado: true };
  }
  return ctx;
}
