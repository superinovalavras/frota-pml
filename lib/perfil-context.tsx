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
import { superintendencias } from "@/lib/mock/superintendencias";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { useFuncoes } from "@/lib/store/funcoes-context";
import { supabaseBrowser } from "@/lib/supabase/client";
import type {
  Funcao,
  Secretaria,
  Superintendencia,
  Usuario,
} from "@/lib/mock/types";

const STORAGE_KEY = "frota-usuario-ativo-v1";

interface PerfilContextValue {
  usuario: Usuario;
  funcao: Funcao | null;
  secretaria: Secretaria;
  superintendencia: Superintendencia | null;
  /** Troca o usuário "ativo" (modo demonstração / Master visualizando como). */
  setUsuarioId: (id: string) => void;
  todosUsuarios: Usuario[];
  /** true quando há uma sessão Supabase autenticada. */
  logado: boolean;
  /** Encerra a sessão e volta para o login. */
  sair: () => Promise<void>;
}

const PerfilContext = createContext<PerfilContextValue | null>(null);

const FALLBACK_USER: Usuario = {
  id: "fallback",
  nome: "—",
  cpf: "",
  masp: "",
  email: "",
  cargo: "",
  funcaoId: "",
  perfil: "servidor",
  hierarquia: 999,
  secretariaId: "",
  superintendenciaId: null,
  telefone: "",
};

function lerUsuarioAtivoLocal(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function gravarUsuarioAtivoLocal(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function PerfilProvider({ children }: { children: ReactNode }) {
  const { usuarios } = useUsuarios();
  const { orgaos } = useOrgaos();
  const { funcoes } = useFuncoes();

  const [usuarioId, setUsuarioIdState] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Sessão autenticada (se houver)
  useEffect(() => {
    let vivo = true;
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        if (vivo) setAuthUserId(data.user?.id ?? null);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // Seleção persistida (modo demonstração)
  useEffect(() => {
    const salvo = lerUsuarioAtivoLocal();
    if (salvo) setUsuarioIdState(salvo);
  }, []);

  // Se logado, fixa o usuário ativo no perfil vinculado à conta
  useEffect(() => {
    if (!authUserId || usuarios.length === 0) return;
    const meu = usuarios.find((u) => u.authUserId === authUserId);
    if (meu) setUsuarioIdState(meu.id);
  }, [authUserId, usuarios]);

  const setUsuarioId = useCallback((id: string) => {
    setUsuarioIdState(id);
    gravarUsuarioAtivoLocal(id);
  }, []);

  const sair = useCallback(async () => {
    try {
      await supabaseBrowser().auth.signOut();
    } finally {
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  }, []);

  const value = useMemo<PerfilContextValue>(() => {
    const usuario =
      (usuarioId ? usuarios.find((u) => u.id === usuarioId) : undefined) ??
      usuarios[0] ??
      FALLBACK_USER;
    const funcao = funcoes.find((f) => f.id === usuario.funcaoId) ?? null;
    const secretaria =
      orgaos.find((s) => s.id === usuario.secretariaId) ??
      orgaos[0] ?? { id: "", nome: "—", sigla: "—" };
    const superintendencia = usuario.superintendenciaId
      ? superintendencias.find((s) => s.id === usuario.superintendenciaId) ??
        null
      : null;
    return {
      usuario,
      funcao,
      secretaria,
      superintendencia,
      setUsuarioId,
      todosUsuarios: usuarios,
      logado: !!authUserId,
      sair,
    };
  }, [usuarioId, usuarios, orgaos, funcoes, authUserId, setUsuarioId, sair]);

  return (
    <PerfilContext.Provider value={value}>{children}</PerfilContext.Provider>
  );
}

export function usePerfil() {
  const ctx = useContext(PerfilContext);
  if (!ctx) {
    throw new Error("usePerfil precisa estar dentro de <PerfilProvider>");
  }
  return ctx;
}
