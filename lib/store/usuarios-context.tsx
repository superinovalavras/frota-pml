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
import { usuarios as seed } from "@/lib/mock/usuarios";
import type { Usuario } from "@/lib/mock/types";
import { useFuncoes } from "./funcoes-context";

const STORAGE_KEY = "frota-usuarios-v1";

interface UsuariosContextValue {
  usuarios: Usuario[];
  buscarPorId: (id: string) => Usuario | undefined;
  /**
   * Salva (cria ou atualiza) um usuário. Os campos `perfil` e `hierarquia`
   * são automaticamente sincronizados a partir da função selecionada.
   */
  salvar: (u: Usuario) => void;
  remover: (id: string) => void;
  /** Lista de usuários que estão no pool de motoristas (função.ehMotorista) */
  motoristasDisponiveis: Usuario[];
}

const UsuariosContext = createContext<UsuariosContextValue | null>(null);

function lerLocal(): Usuario[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Usuario[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function gravarLocal(v: Usuario[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch (e) {
    console.error("Falha ao gravar usuarios no localStorage", e);
  }
}

export function UsuariosProvider({ children }: { children: ReactNode }) {
  const { funcoes } = useFuncoes();
  const [usuarios, setUsuarios] = useState<Usuario[]>(seed);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    const local = lerLocal();
    if (local) setUsuarios(local);
    setHidratado(true);
  }, []);

  // Sincroniza os campos derivados (perfil, hierarquia) sempre que as funções
  // mudarem — assim, se o admin renomear/mover uma função, os usuários
  // afetados refletem automaticamente.
  useEffect(() => {
    if (!hidratado) return;
    setUsuarios((atual) => {
      let mudou = false;
      const sincronizado = atual.map((u) => {
        const f = funcoes.find((x) => x.id === u.funcaoId);
        if (!f) return u;
        const novoPerfil = f.nivelAcesso;
        const novaHierarquia = f.hierarquia;
        if (u.perfil !== novoPerfil || u.hierarquia !== novaHierarquia) {
          mudou = true;
          return { ...u, perfil: novoPerfil, hierarquia: novaHierarquia };
        }
        return u;
      });
      return mudou ? sincronizado : atual;
    });
  }, [funcoes, hidratado]);

  useEffect(() => {
    if (!hidratado) return;
    gravarLocal(usuarios);
  }, [usuarios, hidratado]);

  const buscarPorId = useCallback(
    (id: string) => usuarios.find((u) => u.id === id),
    [usuarios],
  );

  const salvar = useCallback(
    (u: Usuario) => {
      setUsuarios((atual) => {
        const f = funcoes.find((x) => x.id === u.funcaoId);
        const sincronizado: Usuario = f
          ? { ...u, perfil: f.nivelAcesso, hierarquia: f.hierarquia }
          : u;
        const idx = atual.findIndex((x) => x.id === u.id);
        if (idx === -1) return [...atual, sincronizado];
        return atual.map((x, i) => (i === idx ? sincronizado : x));
      });
    },
    [funcoes],
  );

  const remover = useCallback((id: string) => {
    setUsuarios((atual) => atual.filter((u) => u.id !== id));
  }, []);

  const motoristasDisponiveis = useMemo(() => {
    const idsMotorista = new Set(
      funcoes.filter((f) => f.ehMotorista).map((f) => f.id),
    );
    return usuarios.filter((u) => idsMotorista.has(u.funcaoId));
  }, [usuarios, funcoes]);

  const value = useMemo<UsuariosContextValue>(
    () => ({
      usuarios,
      buscarPorId,
      salvar,
      remover,
      motoristasDisponiveis,
    }),
    [usuarios, buscarPorId, salvar, remover, motoristasDisponiveis],
  );

  return (
    <UsuariosContext.Provider value={value}>{children}</UsuariosContext.Provider>
  );
}

export function useUsuarios() {
  const ctx = useContext(UsuariosContext);
  if (!ctx) {
    throw new Error("useUsuarios precisa estar dentro de <UsuariosProvider>");
  }
  return ctx;
}
