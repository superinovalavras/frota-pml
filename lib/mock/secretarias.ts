import type { Secretaria } from "./types";

export const SECRETARIA_ID = "sec-desenvolvimento";

/**
 * Órgãos da Prefeitura de Lavras. Este é o seed inicial — o Master pode
 * adicionar/editar/remover na tela de Administração.
 */
export const secretarias: Secretaria[] = [
  {
    id: SECRETARIA_ID,
    nome: "Secretaria de Desenvolvimento",
    sigla: "SDES",
  },
  {
    id: "sec-administracao",
    nome: "Secretaria de Administração",
    sigla: "SEMAD",
  },
  {
    id: "sec-fazenda",
    nome: "Secretaria de Fazenda",
    sigla: "SEFAZ",
  },
  {
    id: "sec-educacao",
    nome: "Secretaria de Educação",
    sigla: "SEDUC",
  },
  {
    id: "sec-saude",
    nome: "Secretaria de Saúde",
    sigla: "SMS",
  },
  {
    id: "sec-obras",
    nome: "Secretaria de Obras e Serviços Públicos",
    sigla: "SEMOSP",
  },
  {
    id: "sec-meio-ambiente",
    nome: "Secretaria de Meio Ambiente",
    sigla: "SEMMA",
  },
  {
    id: "sec-cultura",
    nome: "Secretaria de Cultura, Turismo e Esportes",
    sigla: "SECTE",
  },
  {
    id: "sec-gabinete",
    nome: "Gabinete do Prefeito",
    sigla: "GABINETE",
  },
];
