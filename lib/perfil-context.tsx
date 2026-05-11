"use client";

import {
  createContext,
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
import { USUARIO_MASTER_ID } from "@/lib/mock/usuarios";
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
  setUsuarioId: (id: string) => void;
  todosUsuarios: Usuario[];
}

const PerfilContext = createContext<PerfilContextValue | null>(null);

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

  const [usuarioId, setUsuarioIdState] = useState<string>(USUARIO_MASTER_ID);

  // Hidrata seleção persistida
  useEffect(() => {
    const salvo = lerUsuarioAtivoLocal();
    if (salvo) setUsuarioIdState(salvo);
  }, []);

  const setUsuarioId = (id: string) => {
    setUsuarioIdState(id);
    gravarUsuarioAtivoLocal(id);
  };

  const value = useMemo<PerfilContextValue>(() => {
    const usuario =
      usuarios.find((u) => u.id === usuarioId) ?? usuarios[0] ?? FALLBACK_USER;
    const funcao = funcoes.find((f) => f.id === usuario.funcaoId) ?? null;
    const secretaria =
      orgaos.find((s) => s.id === usuario.secretariaId) ??
      orgaos[0] ?? {
        id: "",
        nome: "—",
        sigla: "—",
      };
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
    };
  }, [usuarioId, usuarios, orgaos, funcoes]);

  return (
    <PerfilContext.Provider value={value}>{children}</PerfilContext.Provider>
  );
}

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

export function usePerfil() {
  const ctx = useContext(PerfilContext);
  if (!ctx) {
    throw new Error("usePerfil precisa estar dentro de <PerfilProvider>");
  }
  return ctx;
}
