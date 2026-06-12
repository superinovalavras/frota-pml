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
import type { Usuario } from "@/lib/mock/types";
import {
  listarUsuarios,
  removerUsuario,
  upsertUsuario,
} from "@/lib/data/frota";
import { useFuncoes } from "./funcoes-context";
import { notificarFalha } from "@/lib/notificacoes";
import { temCnhValida } from "@/lib/agendamento-utils";

interface UsuariosContextValue {
  usuarios: Usuario[];
  carregando: boolean;
  buscarPorId: (id: string) => Usuario | undefined;
  /**
   * Salva (cria ou atualiza) um usuário. Os campos `perfil` e `hierarquia`
   * são automaticamente sincronizados a partir da função selecionada.
   */
  salvar: (u: Usuario) => void;
  remover: (id: string) => void;
  /** Lista de usuários que estão no pool de motoristas (função.ehMotorista) */
  motoristasDisponiveis: Usuario[];
  /** Re-busca a lista do banco — útil após mutações server-side (ex.: /perfil). */
  recarregar: () => Promise<void>;
}

const UsuariosContext = createContext<UsuariosContextValue | null>(null);

export function UsuariosProvider({ children }: { children: ReactNode }) {
  const { funcoes } = useFuncoes();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    listarUsuarios()
      .then((lista) => {
        if (vivo) setUsuarios(lista);
      })
      .catch((e) => notificarFalha("Falha ao carregar usuários", e))
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Sincroniza os campos derivados (perfil, hierarquia) quando as funções
  // mudarem — só no estado local. (TODO Fase 2b: refletir no banco via trigger,
  // ou eliminar a denormalização e derivar na leitura.)
  useEffect(() => {
    setUsuarios((atual) => {
      let mudou = false;
      const sincronizado = atual.map((u) => {
        const f = funcoes.find((x) => x.id === u.funcaoId);
        if (!f) return u;
        if (u.perfil !== f.nivelAcesso || u.hierarquia !== f.hierarquia) {
          mudou = true;
          return { ...u, perfil: f.nivelAcesso, hierarquia: f.hierarquia };
        }
        return u;
      });
      return mudou ? sincronizado : atual;
    });
  }, [funcoes]);

  const buscarPorId = useCallback(
    (id: string) => usuarios.find((u) => u.id === id),
    [usuarios],
  );

  const salvar = useCallback(
    (u: Usuario) => {
      const f = funcoes.find((x) => x.id === u.funcaoId);
      const sincronizado: Usuario = f
        ? { ...u, perfil: f.nivelAcesso, hierarquia: f.hierarquia }
        : u;
      setUsuarios((atual) => {
        const idx = atual.findIndex((x) => x.id === u.id);
        if (idx === -1) return [...atual, sincronizado];
        return atual.map((x, i) => (i === idx ? sincronizado : x));
      });
      upsertUsuario(sincronizado).catch((e) =>
        notificarFalha("Falha ao salvar usuário", e),
      );
    },
    [funcoes],
  );

  const remover = useCallback((id: string) => {
    setUsuarios((atual) => atual.filter((u) => u.id !== id));
    removerUsuario(id).catch((e) => notificarFalha("Falha ao remover usuário", e));
  }, []);

  const recarregar = useCallback(async () => {
    try {
      const lista = await listarUsuarios();
      setUsuarios(lista);
    } catch (e) {
      notificarFalha("Falha ao recarregar usuários", e);
    }
  }, []);

  // Pool de motoristas: quem tem a FUNÇÃO de motorista OU qualquer servidor
  // com CNH válida cadastrada — qualquer um deles pode ser designado para
  // dirigir (o designado recebe notificação interna no sino).
  const motoristasDisponiveis = useMemo(() => {
    const idsMotorista = new Set(
      funcoes.filter((f) => f.ehMotorista).map((f) => f.id),
    );
    return usuarios.filter(
      (u) => idsMotorista.has(u.funcaoId) || temCnhValida(u),
    );
  }, [usuarios, funcoes]);

  const value = useMemo<UsuariosContextValue>(
    () => ({
      usuarios,
      carregando,
      buscarPorId,
      salvar,
      remover,
      motoristasDisponiveis,
      recarregar,
    }),
    [
      usuarios,
      carregando,
      buscarPorId,
      salvar,
      remover,
      motoristasDisponiveis,
      recarregar,
    ],
  );

  return (
    <UsuariosContext.Provider value={value}>
      {children}
    </UsuariosContext.Provider>
  );
}

export function useUsuarios() {
  const ctx = useContext(UsuariosContext);
  if (!ctx) {
    throw new Error("useUsuarios precisa estar dentro de <UsuariosProvider>");
  }
  return ctx;
}
