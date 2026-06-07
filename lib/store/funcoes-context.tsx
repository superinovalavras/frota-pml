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
import type { Funcao } from "@/lib/mock/types";
import {
  listarFuncoes,
  removerFuncao,
  upsertFuncoes,
} from "@/lib/data/frota";

interface FuncoesContextValue {
  funcoes: Funcao[];
  carregando: boolean;
  /** Lista ordenada por hierarquia ascendente (1 = topo) */
  funcoesOrdenadas: Funcao[];
  /**
   * Funções agrupadas por nível de prioridade, em ordem (índice 0 = topo).
   * Cargos no mesmo grupo estão EMPATADOS (mesma prioridade).
   */
  niveis: Funcao[][];
  buscarPorId: (id: string) => Funcao | undefined;
  salvar: (f: Funcao) => void;
  remover: (id: string) => void;
  /** Promove a função um nível (separa do empate, se houver) */
  moverParaCima: (id: string) => void;
  /** Rebaixa a função um nível (separa do empate, se houver) */
  moverParaBaixo: (id: string) => void;
  /** Empata a função com o nível imediatamente acima (mesma prioridade) */
  empatarComAcima: (id: string) => void;
  /** Tira a função de um empate, dando a ela um nível próprio logo abaixo */
  separar: (id: string) => void;
}

const FuncoesContext = createContext<FuncoesContextValue | null>(null);

/**
 * Agrupa as funções por nível de prioridade. Master fica sempre sozinho no
 * topo. Demais funções formam grupos por valor de `hierarquia` igual (empate).
 */
function agrupar(funcoes: Funcao[]): Funcao[][] {
  const master = funcoes.filter((f) => f.ehMaster);
  const resto = funcoes
    .filter((f) => !f.ehMaster)
    .slice()
    .sort((a, b) => a.hierarquia - b.hierarquia || a.nome.localeCompare(b.nome));
  const grupos: Funcao[][] = [];
  if (master.length) grupos.push(master);
  let nivelAtual: number | null = null;
  for (const f of resto) {
    if (nivelAtual === null || f.hierarquia !== nivelAtual) {
      grupos.push([f]);
      nivelAtual = f.hierarquia;
    } else {
      grupos[grupos.length - 1].push(f);
    }
  }
  return grupos;
}

/** Reatribui hierarquia 1..N a partir da ordem dos grupos, preservando empates. */
function aplicarGrupos(grupos: Funcao[][]): Funcao[] {
  const limpos = grupos.filter((g) => g.length > 0);
  const out: Funcao[] = [];
  limpos.forEach((g, i) => {
    for (const f of g) out.push({ ...f, hierarquia: i + 1 });
  });
  return out;
}

/** Compacta níveis (remove buracos) mantendo os empates existentes. */
function normalizar(lista: Funcao[]): Funcao[] {
  return aplicarGrupos(agrupar(lista));
}

function persistir(lista: Funcao[]) {
  upsertFuncoes(lista).catch((e) => console.error("Falha ao salvar funções", e));
}

export function FuncoesProvider({ children }: { children: ReactNode }) {
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    listarFuncoes()
      .then((lista) => {
        if (vivo) setFuncoes(lista);
      })
      .catch((e) => console.error("Falha ao carregar funções", e))
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const funcoesOrdenadas = useMemo(
    () =>
      funcoes
        .slice()
        .sort((a, b) => a.hierarquia - b.hierarquia || a.nome.localeCompare(b.nome)),
    [funcoes],
  );

  const niveis = useMemo(() => agrupar(funcoes), [funcoes]);

  const buscarPorId = useCallback(
    (id: string) => funcoes.find((f) => f.id === id),
    [funcoes],
  );

  const salvar = useCallback((f: Funcao) => {
    setFuncoes((atual) => {
      const idx = atual.findIndex((x) => x.id === f.id);
      const nova =
        idx === -1 ? [...atual, f] : atual.map((x, i) => (i === idx ? f : x));
      const norm = normalizar(nova);
      persistir(norm);
      return norm;
    });
  }, []);

  const remover = useCallback((id: string) => {
    setFuncoes((atual) => {
      const alvo = atual.find((x) => x.id === id);
      if (!alvo || alvo.sistema) return atual;
      const norm = normalizar(atual.filter((x) => x.id !== id));
      removerFuncao(id)
        .then(() => persistir(norm))
        .catch((e) => console.error("Falha ao remover função", e));
      return norm;
    });
  }, []);

  // --- operações sobre os grupos de nível ---------------------------------

  const aplicar = useCallback((grupos: Funcao[][]) => {
    const norm = aplicarGrupos(grupos);
    persistir(norm);
    return norm;
  }, []);

  const moverParaCima = useCallback(
    (id: string) => {
      setFuncoes((atual) => {
        const grupos = agrupar(atual).map((g) => g.slice());
        const gi = grupos.findIndex((g) => g.some((f) => f.id === id));
        if (gi < 0) return atual;
        const grupo = grupos[gi];
        if (grupo.some((f) => f.ehMaster)) return atual; // Master fixo no topo
        const masterPresente = grupos[0]?.some((f) => f.ehMaster);
        const minIndex = masterPresente ? 1 : 0;
        if (grupo.length > 1) {
          // separa para um nível próprio logo acima dos ex-empatados
          const funcao = grupo.find((f) => f.id === id)!;
          grupos[gi] = grupo.filter((f) => f.id !== id);
          grupos.splice(gi, 0, [funcao]);
          return aplicar(grupos);
        }
        if (gi <= minIndex) return atual; // já no topo permitido
        [grupos[gi - 1], grupos[gi]] = [grupos[gi], grupos[gi - 1]];
        return aplicar(grupos);
      });
    },
    [aplicar],
  );

  const moverParaBaixo = useCallback(
    (id: string) => {
      setFuncoes((atual) => {
        const grupos = agrupar(atual).map((g) => g.slice());
        const gi = grupos.findIndex((g) => g.some((f) => f.id === id));
        if (gi < 0) return atual;
        const grupo = grupos[gi];
        if (grupo.some((f) => f.ehMaster)) return atual;
        const maxIndex = grupos.length - 1;
        if (grupo.length > 1) {
          const funcao = grupo.find((f) => f.id === id)!;
          grupos[gi] = grupo.filter((f) => f.id !== id);
          grupos.splice(gi + 1, 0, [funcao]);
          return aplicar(grupos);
        }
        if (gi >= maxIndex) return atual;
        [grupos[gi], grupos[gi + 1]] = [grupos[gi + 1], grupos[gi]];
        return aplicar(grupos);
      });
    },
    [aplicar],
  );

  const empatarComAcima = useCallback(
    (id: string) => {
      setFuncoes((atual) => {
        const grupos = agrupar(atual).map((g) => g.slice());
        const gi = grupos.findIndex((g) => g.some((f) => f.id === id));
        if (gi < 0) return atual;
        const grupo = grupos[gi];
        if (grupo.some((f) => f.ehMaster)) return atual;
        const masterPresente = grupos[0]?.some((f) => f.ehMaster);
        const minIndex = masterPresente ? 1 : 0;
        if (gi <= minIndex) return atual; // nada acima para empatar (ou só Master)
        const funcao = grupo.find((f) => f.id === id)!;
        grupos[gi] = grupo.filter((f) => f.id !== id);
        grupos[gi - 1] = [...grupos[gi - 1], funcao];
        return aplicar(grupos);
      });
    },
    [aplicar],
  );

  const separar = useCallback(
    (id: string) => {
      setFuncoes((atual) => {
        const grupos = agrupar(atual).map((g) => g.slice());
        const gi = grupos.findIndex((g) => g.some((f) => f.id === id));
        if (gi < 0) return atual;
        const grupo = grupos[gi];
        if (grupo.length <= 1 || grupo.some((f) => f.ehMaster)) return atual;
        const funcao = grupo.find((f) => f.id === id)!;
        grupos[gi] = grupo.filter((f) => f.id !== id);
        grupos.splice(gi + 1, 0, [funcao]);
        return aplicar(grupos);
      });
    },
    [aplicar],
  );

  const value = useMemo<FuncoesContextValue>(
    () => ({
      funcoes,
      carregando,
      funcoesOrdenadas,
      niveis,
      buscarPorId,
      salvar,
      remover,
      moverParaCima,
      moverParaBaixo,
      empatarComAcima,
      separar,
    }),
    [
      funcoes,
      carregando,
      funcoesOrdenadas,
      niveis,
      buscarPorId,
      salvar,
      remover,
      moverParaCima,
      moverParaBaixo,
      empatarComAcima,
      separar,
    ],
  );

  return (
    <FuncoesContext.Provider value={value}>{children}</FuncoesContext.Provider>
  );
}

export function useFuncoes() {
  const ctx = useContext(FuncoesContext);
  if (!ctx) {
    throw new Error("useFuncoes precisa estar dentro de <FuncoesProvider>");
  }
  return ctx;
}
