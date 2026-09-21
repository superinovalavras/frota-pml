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
import { usePerfil } from "@/lib/perfil-context";
import {
  listarComunicados,
  listarMeusVistos,
  registrarVisto,
} from "@/lib/data/comunicados";
import type { Comunicado } from "@/lib/mock/types";

interface ComunicadosContextValue {
  /** Comunicados ativos, na janela e direcionados a mim, que ainda não dispensei. */
  pendentes: Comunicado[];
  /** Todos os comunicados que posso ver (para o histórico). */
  todos: Comunicado[];
  carregando: boolean;
  /** Dispensa (não mostrar novamente); `ciente` registra "Li e estou ciente". */
  dispensar: (comunicadoId: string, opts?: { ciente?: boolean }) => Promise<void>;
  /** Fecha só nesta sessão (volta a aparecer no próximo acesso). */
  fecharSessao: (comunicadoId: string) => void;
  recarregar: () => Promise<void>;
}

const Ctx = createContext<ComunicadosContextValue | null>(null);

function dentroDaJanela(c: Comunicado): boolean {
  const agora = Date.now();
  const ini = new Date(c.inicioEm).getTime();
  const fim = new Date(c.fimEm).getTime();
  return c.ativo && ini <= agora && agora <= fim;
}

function direcionadoA(c: Comunicado, secretariaId: string): boolean {
  return c.publicoAlvo === "todos" || c.secretarias.includes(secretariaId);
}

export function ComunicadosProvider({ children }: { children: ReactNode }) {
  const { usuario, logado } = usePerfil();
  const [todos, setTodos] = useState<Comunicado[]>([]);
  const [dispensados, setDispensados] = useState<Set<string>>(new Set());
  const [fechadosSessao, setFechadosSessao] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!logado) return;
    setCarregando(true);
    try {
      const [lista, vistos] = await Promise.all([
        listarComunicados(),
        listarMeusVistos(),
      ]);
      setTodos(lista);
      setDispensados(
        new Set(vistos.filter((v) => v.dispensado).map((v) => v.comunicadoId)),
      );
    } catch (e) {
      console.error("Falha ao carregar comunicados", e);
    } finally {
      setCarregando(false);
    }
  }, [logado]);

  useEffect(() => {
    if (logado) recarregar();
  }, [logado, recarregar]);

  const pendentes = useMemo(() => {
    return todos.filter(
      (c) =>
        dentroDaJanela(c) &&
        direcionadoA(c, usuario.secretariaId) &&
        !dispensados.has(c.id) &&
        !fechadosSessao.has(c.id),
    );
  }, [todos, usuario.secretariaId, dispensados, fechadosSessao]);

  const dispensar = useCallback(
    async (comunicadoId: string, opts?: { ciente?: boolean }) => {
      // otimista
      setDispensados((s) => new Set(s).add(comunicadoId));
      try {
        await registrarVisto(comunicadoId, usuario.id, opts);
      } catch (e) {
        console.error("Falha ao dispensar comunicado", e);
      }
    },
    [usuario.id],
  );

  const fecharSessao = useCallback((comunicadoId: string) => {
    setFechadosSessao((s) => new Set(s).add(comunicadoId));
  }, []);

  const value = useMemo<ComunicadosContextValue>(
    () => ({ pendentes, todos, carregando, dispensar, fecharSessao, recarregar }),
    [pendentes, todos, carregando, dispensar, fecharSessao, recarregar],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useComunicados(): ComunicadosContextValue {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useComunicados precisa estar dentro de <ComunicadosProvider>");
  return ctx;
}
