/**
 * Chaves de funcionalidades "dormentes" — código pronto, mas desligado
 * para simplificar a operação no início. Para reativar, basta mudar
 * para `true` (nenhum outro ajuste é necessário).
 */

/**
 * Registro de foto do painel + quilometragem no check-in/check-out.
 * Desligado a pedido da operação: a portaria anota o KM manualmente.
 * Com `false`, o check-in/out vira um clique (só observações opcionais);
 * os campos km_saida/km_retorno/fotos ficam vazios no banco e o trigger
 * de KM do veículo simplesmente não dispara (km_retorno é null).
 */
export const REGISTRO_PAINEL_ATIVO = false;

/**
 * Notificações por email (cancelamento, substituição, manutenção,
 * passageiros). Desligadas no início da operação — no lugar, o app mostra
 * o TELEFONE do solicitante/motorista para contato direto entre as pessoas.
 * Com `false`:
 *   - nada novo entra na fila `email_outbox` (enfileirar vira no-op);
 *   - o processador/cron não envia nada (processarFila retorna vazio).
 * O pipeline inteiro (outbox, dispatcher, templates) permanece intacto.
 */
export const NOTIFICACOES_EMAIL_ATIVAS = false;
