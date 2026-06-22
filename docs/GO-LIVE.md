# Checklist de Go-Live — FROTA PML

> Passo a passo para colocar/atualizar o sistema no ar com as correções de
> segurança e integridade. Siga **na ordem** — o passo 1 (banco) vem **antes**
> do deploy, senão a listagem de usuários quebra.

---

## 0. Acessos necessários (conta `superinovalavras`)

- [ ] **Supabase** — projeto `rjdfzpvqevdswumdlgnr` (SQL Editor / Settings).
- [ ] **Vercel** — projeto que serve `frota-pml.vercel.app`.
- [ ] **GitHub** — `superinovalavras/frota-pml` (push na `master` faz deploy).

---

## 1. Banco de dados (Supabase) — FAZER PRIMEIRO

As migrations aplicam-se **em ordem**. Duas formas: SQL Editor (colar o
conteúdo) ou o script `scripts/db-run.mjs` (precisa de `SUPABASE_DB_URL` no
`.env.local`; ver [ARQUITETURA §11](ARQUITETURA.md#11-aplicando-migrations)).

- [ ] **Confirmar 0008 (`veiculos.lugares`)** aplicada. Sem ela, salvar veículo
      quebra. Conferir:
      ```sql
      select column_name from information_schema.columns
       where table_name='veiculos' and column_name='lugares';
      ```
      Se vazio, aplique `supabase/migrations/0008_lugares.sql`.

- [ ] **Conferir dados antes da 0009** (sobreposições e CPF/MASP/e-mail
      duplicados — ver cabeçalho do arquivo, ou `db-run.mjs check`). Se houver
      linhas, **limpe antes**, senão a criação das constraints falha.

- [ ] **Aplicar `0009_integridade.sql`** (anti-double-booking, guarda de status,
      índices únicos).

- [ ] **Aplicar `0010_privacidade.sql`** (view `usuarios_visiveis` com CPF/MASP
      mascarados + INSERT de notificações restrito). Requer **PostgreSQL 15+**.

- [ ] **Verificar** que os 7 objetos existem (`db-run.mjs verify`, ou conferir
      no painel a view `usuarios_visiveis` e a constraint
      `agendamentos_sem_sobreposicao`).

- [ ] Anotar em [`docs/CLAUDE.md`](CLAUDE.md) que 0008–0010 foram aplicadas.

---

## 2. Variáveis de ambiente (Vercel → Settings → Environment Variables)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (secret — só servidor)
- [ ] `CRON_SECRET` — **agora obrigatório** para o cron `/api/email/dispatch`
      funcionar (a rota passou a recusar sem o segredo em produção). Gere um
      valor aleatório longo. *(Inerte enquanto e-mail estiver desligado, mas
      configure já para não esquecer.)*
- [ ] **Só se for ligar e-mail** (flag `NOTIFICACOES_EMAIL_ATIVAS`):
      `RESEND_API_KEY` e `EMAIL_REMETENTE` (domínio verificado no Resend).

> O `.env.local` (local) não vai no git — as mesmas chaves vivem no Vercel.

---

## 3. Deploy

- [ ] `git pull` (evitar conflito entre contas/máquinas).
- [ ] Merge da branch `fix/revisao-seguranca-integridade` na `master`.
- [ ] `git push` → Vercel faz o deploy automático.
- [ ] Acompanhar o build no painel da Vercel até "Ready".

---

## 4. Smoke test pós-deploy (em produção, logado)

- [ ] **Login** por e-mail e por CPF/MASP.
- [ ] **Listar usuários** (ex.: aba Admin ou seletor) — confirma que a view
      `usuarios_visiveis` está OK. Um **servidor comum NÃO deve ver CPF/MASP**
      de colegas (deve aparecer vazio); o próprio e o master/gestor veem.
- [ ] **Criar reserva** sem conflito → sucesso.
- [ ] **Criar reserva sobreposta** → bloqueada (conflito / substituição).
- [ ] **Gestor confirma** uma reserva pendente → OK; **servidor não** consegue
      confirmar a própria (botão some / ação recusada).
- [ ] **Iniciar e concluir** uma viagem confirmada como solicitante → OK.
- [ ] **Sino de notificações** chega ao designar motorista.
- [ ] **Colocar/retirar** um veículo de manutenção (como gestor/master).

---

## 5. Operação inicial

- [ ] Senha padrão de contas criadas: `Frota@Lavras2026` — **orientar cada
      pessoa a trocar** no primeiro acesso (Meu perfil → Trocar senha).
- [ ] Master cadastra os usuários reais, veículos e a hierarquia das funções.
- [ ] Conferir que as fotos (perfis/veículos) sobem (bucket `imagens`).

---

## 6. Atenção / rollback

- **Ordem importa:** o código já lê a view `usuarios_visiveis`. Se fizer deploy
  **sem** aplicar a 0010, a tela de usuários quebra. Aplique o banco primeiro.
- **Constraints podem falhar** se houver dados sujos (sobreposições/duplicatas) —
  por isso o passo de conferência. Não force; limpe os dados.
- **Reverter código:** as migrations são aditivas; reverter o deploy (Vercel →
  Deployments → Promote anterior) volta o front sem desfazer o banco. As
  constraints/trigger/view podem ser removidas manualmente se necessário
  (`drop constraint agendamentos_sem_sobreposicao`, `drop trigger
  agendamentos_guard_status on public.agendamentos`, `drop view
  usuarios_visiveis` — mas aí reverta também o `lib/data/frota.ts`).
