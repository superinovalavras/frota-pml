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
  listarMinhasNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
  type Notificacao,
} from "@/lib/data/notificacoes";

const POLL_MS = 60_000;

interface NotificacoesContextValue {
  notificacoes: Notificacao[];
  naoLidas: number;
  marcarLida: (id: string) => void;
  marcarTodasLidas: () => void;
  recarregar: () => Promise<void>;
}

const NotificacoesContext = createContext<NotificacoesContextValue | null>(
  null,
);

export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const { logado } = usePerfil();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  const recarregar = useCallback(async () => {
    try {
      const lista = await listarMinhasNotificacoes();
      // Preserva o "lida" otimista: se o usuário acabou de marcar como lida
      // localmente e o write ainda não commitou, a re-busca não pode
      // "des-ler". Uma vez lida no cliente, permanece lida.
      setNotificacoes((prev) => {
        const lidasLocais = new Set(
          prev.filter((n) => n.lida).map((n) => n.id),
        );
        return lista.map((n) =>
          lidasLocais.has(n.id) ? { ...n, lida: true } : n,
        );
      });
    } catch (e) {
      // Sem sessão (ou rede fora) — sem alarde; o sino fica vazio.
      console.warn("notificações:", e);
    }
  }, []);

  // Carrega ao logar e re-busca periodicamente (polling simples).
  useEffect(() => {
    if (!logado) return;
    let vivo = true;
    const carregar = () => {
      listarMinhasNotificacoes()
        .then((lista) => {
          if (!vivo) return;
          setNotificacoes((prev) => {
            const lidasLocais = new Set(
              prev.filter((n) => n.lida).map((n) => n.id),
            );
            return lista.map((n) =>
              lidasLocais.has(n.id) ? { ...n, lida: true } : n,
            );
          });
        })
        .catch((e) => console.warn("notificações:", e));
    };
    carregar();
    const id = setInterval(carregar, POLL_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [logado]);

  const marcarLida = useCallback((id: string) => {
    setNotificacoes((atual) =>
      atual.map((n) => (n.id === id ? { ...n, lida: true } : n)),
    );
    marcarNotificacaoLida(id).catch((e) => console.warn(e));
  }, []);

  const marcarTodasLidas = useCallback(() => {
    setNotificacoes((atual) => atual.map((n) => ({ ...n, lida: true })));
    marcarTodasNotificacoesLidas().catch((e) => console.warn(e));
  }, []);

  const naoLidas = useMemo(
    () => notificacoes.filter((n) => !n.lida).length,
    [notificacoes],
  );

  const value = useMemo<NotificacoesContextValue>(
    () => ({ notificacoes, naoLidas, marcarLida, marcarTodasLidas, recarregar }),
    [notificacoes, naoLidas, marcarLida, marcarTodasLidas, recarregar],
  );

  return (
    <NotificacoesContext.Provider value={value}>
      {children}
    </NotificacoesContext.Provider>
  );
}

export function useNotificacoes() {
  const ctx = useContext(NotificacoesContext);
  if (!ctx) {
    throw new Error(
      "useNotificacoes precisa estar dentro de <NotificacoesProvider>",
    );
  }
  return ctx;
}
