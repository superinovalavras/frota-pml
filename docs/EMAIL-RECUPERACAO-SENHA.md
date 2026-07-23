# Ligar o "Esqueci minha senha"

Passo a passo para ativar a recuperação de senha por e-mail.

O e-mail de recuperação é enviado **pelo próprio Supabase**, não pelo nosso
código — por isso **nenhuma alteração de código é necessária** aqui, só
configuração no painel. (As notificações do app são outro caminho: passam por
`lib/email/enviar.ts` → Resend, e continuam desligadas por
`NOTIFICACOES_EMAIL_ATIVAS`.)

---

## 1. Conta de envio

Criar um Gmail dedicado (ex.: `frota.pml@gmail.com`), **não** usar a conta que
é dona do Supabase/GitHub/Vercel.

Motivo: a senha de app dá acesso de **leitura** à caixa. Se a caixa for a da
conta-dona, quem pegar a senha lê os e-mails de recuperação de todas as outras
contas. Numa caixa dedicada, que só envia, o estrago é zero.

Requisitos da conta:

- Precisa ser conta **pessoal** (`@gmail.com`). Contas Workspace (empresa/escola)
  e contas com Proteção Avançada **não** permitem senha de app.
- **2FA obrigatório** — o Google só mostra a opção de senha de app depois.
- Configure o 2FA com **app autenticador**. Se configurar *só* com chave de
  segurança/passkey, a senha de app fica indisponível.

## 2. Senha de app

`myaccount.google.com/apppasswords` → gera 16 caracteres.

- Vale **só** para o SMTP; não é a senha da conta.
- **Trocar a senha da conta Google revoga todas as senhas de app.** Se o envio
  parar do nada um dia, é aqui que se olha primeiro.
- Ela vive **apenas** no campo de SMTP do Supabase. Não vai para `.env`,
  repositório, nem mensagem.

## 3. SMTP no Supabase

Painel → Authentication → SMTP Settings:

| Campo | Valor |
| --- | --- |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | o e-mail dedicado completo |
| Password | a senha de app (16 caracteres) |
| Sender email | o mesmo e-mail |
| Sender name | `FROTA PML` |

Limite do Gmail: ~500 mensagens/dia — muito acima da necessidade (17 usuários).

## 4. URLs

Painel → Authentication → URL Configuration:

- **Site URL:** `https://frota-pml.vercel.app`
- **Redirect URLs:** adicionar `https://frota-pml.vercel.app/auth/confirm`

Sem isso o link do e-mail é recusado como redirect não autorizado.

## 5. Template do e-mail

Painel → Authentication → Email Templates → **Reset Password**.

O link **precisa** usar `{{ .TokenHash }}` e apontar para `/auth/confirm` — é a
nossa rota que troca o token por sessão (ver `app/auth/confirm/route.ts`). O
`ConfirmationURL` padrão do Supabase **não** funciona com este fluxo.

Assunto:

```
FROTA PML — Recuperação de senha
```

Corpo (mesmo visual dos outros e-mails do sistema — ver
`lib/email/templates/helpers.ts`):

```html
<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%">
        <tr>
          <td style="padding:20px 24px;background:#1f2937;color:#ffffff">
            <h1 style="margin:0;font-size:18px;font-weight:600">FROTA PML — Recuperação de senha</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px">
            <p style="margin:0 0 16px">Olá,</p>
            <p style="margin:0 0 16px">
              Recebemos um pedido para redefinir a sua senha do sistema de
              gestão da frota municipal. Clique no botão abaixo para criar uma
              senha nova:
            </p>
            <p style="margin:0 0 24px;text-align:center">
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nova-senha"
                 style="display:inline-block;padding:12px 24px;background:#1f2937;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">
                Criar senha nova
              </a>
            </p>
            <p style="margin:0 0 16px;font-size:14px;color:#6b7280">
              O link vale por 1 hora e só pode ser usado uma vez.
            </p>
            <p style="margin:0;font-size:14px;color:#6b7280">
              Se você não pediu isso, ignore este e-mail — sua senha continua a
              mesma.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center">
            Esta é uma mensagem automática — não responda este e-mail.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

## 6. Ligar a chave

Em `lib/flags.ts`: `RECUPERACAO_SENHA_EMAIL_ATIVA = true` → commit → push
(a Vercel publica sozinha).

Com `false`, o link some do login e a tela `/esqueci-senha` explica que o
caminho é pedir a um Master. Isso existe porque `resetPasswordForEmail`
responde **sucesso mesmo sem entregar** (proteção anti-enumeração do Supabase):
sem SMTP a pessoa veria "Link enviado!" e não receberia nada.

## 7. Testar

1. `/login` → "Esqueci minha senha"
2. Informar um usuário real → conferir se o e-mail chega (ver spam também)
3. Clicar no link → deve abrir `/nova-senha`
4. Definir a senha → entra no sistema
5. Conferir que o link não funciona uma segunda vez

## Se algo falhar

| Sintoma | Causa provável |
| --- | --- |
| "Link enviado" mas nada chega | SMTP não configurado, ou caiu no spam |
| Link leva ao login em vez de `/nova-senha` | Redirect URL não cadastrada (passo 4) |
| "Seu link expirou" na primeira tentativa | Template sem `{{ .TokenHash }}` (passo 5) |
| Parou de enviar de repente | Senha da conta Google trocada → senha de app revogada |
| Erro ao criar usuário no painel Admin | *Leaked password protection* ligada no Supabase rejeita `123456` |
