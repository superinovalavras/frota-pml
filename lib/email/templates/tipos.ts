/**
 * Forma de saída de qualquer template de email.
 * `assunto` pode ou não ser usado — a coluna `assunto` no outbox tem
 * precedência se preenchida. `html` e `texto` são obrigatórios para que
 * caixas que não renderizam HTML ainda exibam algo legível.
 */
export interface TemplateRenderizado {
  assunto: string;
  html: string;
  texto: string;
}
