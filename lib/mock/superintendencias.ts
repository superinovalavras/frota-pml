import type { Superintendencia } from "./types";
import { SECRETARIA_ID } from "./secretarias";

export const superintendencias: Superintendencia[] = [
  {
    id: "sup-inovacao",
    nome: "Superintendência de Inovação",
    sigla: "INOV",
    secretariaId: SECRETARIA_ID,
  },
  {
    id: "sup-regulacao-urbana",
    nome: "Regulação Urbana",
    sigla: "REG",
    secretariaId: SECRETARIA_ID,
  },
  {
    id: "sup-sala-mineira",
    nome: "Sala Mineira",
    sigla: "SM",
    secretariaId: SECRETARIA_ID,
  },
  {
    id: "sup-fiscalizacao",
    nome: "Fiscalização de Indústria e Comércio",
    sigla: "FIC",
    secretariaId: SECRETARIA_ID,
  },
];
