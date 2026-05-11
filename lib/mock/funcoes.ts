import type { Funcao } from "./types";

/**
 * Hierarquia inicial da Prefeitura.
 * Convenção: número MENOR = prioridade MAIOR (1 = topo).
 * - Master e Motorista são funções de sistema (não excluíveis).
 * - Fiscais aparecem na posição 2 por importância operacional.
 */
export const FUNCAO_MASTER_ID = "f-master";
export const FUNCAO_MOTORISTA_ID = "f-motorista";

export const funcoes: Funcao[] = [
  {
    id: FUNCAO_MASTER_ID,
    nome: "Master",
    hierarquia: 1,
    nivelAcesso: "master",
    sistema: true,
    ehMaster: true,
  },
  {
    id: "f-fiscal",
    nome: "Fiscal",
    hierarquia: 2,
    nivelAcesso: "servidor",
  },
  {
    id: "f-secretario",
    nome: "Secretário(a)",
    hierarquia: 3,
    nivelAcesso: "gestor",
  },
  {
    id: "f-superintendente",
    nome: "Superintendente",
    hierarquia: 4,
    nivelAcesso: "gestor",
  },
  {
    id: "f-subsecretario",
    nome: "Subsecretário(a)",
    hierarquia: 5,
    nivelAcesso: "gestor",
  },
  {
    id: "f-servidor",
    nome: "Servidor(a)",
    hierarquia: 10,
    nivelAcesso: "servidor",
  },
  {
    id: FUNCAO_MOTORISTA_ID,
    nome: "Motorista",
    hierarquia: 99,
    nivelAcesso: "servidor",
    sistema: true,
    ehMotorista: true,
  },
];
