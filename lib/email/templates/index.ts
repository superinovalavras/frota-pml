/**
 * Renderiza um item da fila `email_outbox` em assunto/html/texto prontos
 * para envio. O dispatcher chama esta função para cada item pendente.
 *
 * Cada novo `tipo_evento` adicionado ao schema deve ter um template aqui.
 */
import type { EmailEventoTipo } from "@/lib/mock/types";
import type { TemplateRenderizado } from "./tipos";
import { renderizarManutencaoVeiculo } from "./manutencao-veiculo";
import { renderizarAgendamentoCancelado } from "./agendamento-cancelado";
import { renderizarPassageiroAdicionado } from "./passageiro-adicionado";
import { renderizarPassageiroRemovido } from "./passageiro-removido";

export function renderizarTemplate(
  tipo: EmailEventoTipo,
  destinatarioNome: string,
  payload: unknown,
): TemplateRenderizado {
  switch (tipo) {
    case "manutencao_veiculo":
      return renderizarManutencaoVeiculo(destinatarioNome, payload);
    case "agendamento_cancelado":
      return renderizarAgendamentoCancelado(destinatarioNome, payload);
    case "passageiro_adicionado":
      return renderizarPassageiroAdicionado(destinatarioNome, payload);
    case "passageiro_removido":
      return renderizarPassageiroRemovido(destinatarioNome, payload);
    default: {
      const exhaustivo: never = tipo;
      throw new Error(`Tipo de evento desconhecido: ${String(exhaustivo)}`);
    }
  }
}
