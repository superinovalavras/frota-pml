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

/**
 * Autoatendimento de senha ("Esqueci minha senha" → link no e-mail).
 *
 * Desligado até o SMTP estar configurado no Supabase (Auth → SMTP Settings).
 * O motivo de existir a chave: `resetPasswordForEmail` responde SUCESSO mesmo
 * quando não consegue entregar (é proteção anti-enumeração do Supabase). Sem
 * SMTP, a pessoa veria "Link enviado!" e não receberia nada — pior que não ter
 * o botão. Com `false`:
 *   - o link some da tela de login;
 *   - /esqueci-senha explica que o caminho é pedir a um Master.
 * O reset pelo Master (painel Admin) NÃO depende desta chave e funciona sempre.
 *
 * Para ligar, além de virar `true`:
 *   1. Supabase → Auth → SMTP Settings: host/porta/usuário/senha do remetente;
 *   2. Supabase → Auth → URL Configuration: Site URL = https://frota-pml.vercel.app
 *      e a mesma URL + /auth/confirm nas Redirect URLs;
 *   3. Supabase → Auth → Email Templates → Reset Password, com o link apontando
 *      para a nossa rota (ver app/auth/confirm/route.ts).
 */
export const RECUPERACAO_SENHA_EMAIL_ATIVA = false;
