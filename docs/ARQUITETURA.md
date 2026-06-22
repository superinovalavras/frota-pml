# Guia de Arquitetura — FROTA PML

> Para quem está chegando agora no projeto. Lê-se em ~15 min e te dá o mapa
> mental para navegar o código com segurança. Para o **estado atual / o que já
> funciona**, veja [`docs/CLAUDE.md`](CLAUDE.md). Para **rodar localmente**,
> veja o [`README.md`](../README.md).

---

## 1. O que é

Sistema web da Prefeitura de Lavras para **agendar e gerir a frota municipal**:
cadastro de veículos/usuários, reservas com controle de conflito, agenda visual,
manutenção, notificações e relatórios. Está **em produção**
(https://frota-pml.vercel.app).

## 2. Stack e topologia

```
Navegador ──► Next.js (Vercel) ──► Supabase (Postgres + Auth + Storage)
                  │
                  ├─ Server Components / Server Actions / Route Handlers (Node)
                  └─ Client Components (React) ──► Supabase direto (com RLS)
```

- **Next.js 16 (App Router) + React 19 + Tailwind 4 + shadcn/ui** no front.
- **Supabase** é todo o backend: banco Postgres, autenticação, armazenamento de
  imagens e **RLS** (segurança por linha). Não há servidor próprio além do Next.
- **Vercel** hospeda o front e roda os **cron jobs** (`vercel.json`).

> ⚠️ **Next.js 16 tem breaking changes** em relação a versões anteriores. Antes
> de mexer em coisas de framework, consulte `node_modules/next/dist/docs/`.
> Exemplo: o antigo `middleware.ts` aqui se chama **`proxy.ts`**.

## 3. As duas "metades" do código

Toda funcionalidade existe em uma destas duas formas — saber em qual você está é
o que mais importa:

| | **Cliente** (navegador) | **Servidor** (Node, no Vercel) |
|---|---|---|
| Onde | `"use client"` components, `lib/store/*` | Server Actions (`actions.ts`), Route Handlers (`app/api/*`) |
| Acessa o banco via | `supabaseBrowser()` — chave **publishable**, **sujeito à RLS** | `criarSupabaseServer()` (sessão) ou `criarSupabaseAdmin()` (**ignora RLS**) |
| Camada de dados | `lib/data/*` (queries) | acesso direto + `lib/api/autenticar.ts` |
| Quem garante a segurança | a **RLS no banco** | o **código da rota** (checa perfil/secretaria) |

Regra de ouro: **operação privilegiada (criar usuário, cancelar reserva de
terceiro, manutenção) mora no servidor** e usa o cliente admin depois de checar
quem é o ator. O cliente comum confia na RLS.

## 4. Fluxo de uma leitura e de uma escrita (cliente)

```
Tela (component) ──► Context (lib/store/*) ──► lib/data/frota.ts ──► Supabase
        ▲                                            │
        └────────────── mappers (lib/data/mappers.ts) ◄──┘
```

1. A tela lê de um **context** (ex.: `useVeiculos()`), nunca chama o Supabase
   direto.
2. O context, ao montar, chama uma função de **`lib/data/`** (ex.:
   `listarVeiculos()`).
3. `lib/data/` fala com o Supabase e converte cada linha com os **mappers**
   (snake_case do banco ↔ camelCase do app; conversão de datas/fuso).
4. Escrita: a tela chama `salvar()` no context → atualização **otimista** no
   estado + `upsert*()` em `lib/data/` → se falhar, mostra toast e reverte.

**Convenção forte:** todo acesso ao banco passa por `lib/data/`. Não espalhe
`supabaseBrowser()` pelas telas.

## 5. Os três clientes Supabase (`lib/supabase/`)

| Arquivo | Função | Quando usar |
|---|---|---|
| `client.ts` | `supabaseBrowser()` | Client Components / contexts. Chave publishable. **RLS ativa.** |
| `server.ts` | `criarSupabaseServer()` | Server Components / Actions / rotas. Lê a sessão dos cookies. RLS ativa. |
| `server.ts` | `criarSupabaseAdmin()` | **Só no servidor.** Chave secreta (service_role) que **ignora a RLS**. Para criar contas, jobs, operações de admin. Nunca exponha ao navegador. |
| `middleware.ts` | `atualizarSessao()` | Chamado pelo `proxy.ts` em toda requisição: renova o token e **exige login**. |

## 6. Autenticação

- Login por **CPF, MASP ou e-mail** + senha (`app/(auth)/login/`). Sem "@", o
  servidor resolve CPF/MASP → e-mail (consulta admin) e então autentica.
- O `proxy.ts` (middleware) redireciona qualquer rota protegida para `/login` se
  não houver sessão. Públicas: `/login` e `/api/*` (as rotas de API autorizam
  por conta própria).
- Cada pessoa em `profiles` liga-se 1:1 a uma conta do Supabase Auth via
  `auth_user_id`. **Ninguém se cadastra sozinho** — o Master cria os usuários.

## 7. Segurança no banco: RLS e migrations

A segurança real está nas **políticas RLS** do Postgres, não no front. Funções
auxiliares (`eh_master()`, `meu_profile_id()`, `minha_secretaria()`,
`gestor_do_veiculo()`…) são definidas nas migrations e usadas pelas políticas.

- As migrations ficam em **`supabase/migrations/`**, numeradas e aplicadas **em
  ordem**.
- **Como aplicar** (duas formas):
  - **SQL Editor** do Supabase: copie/cole o conteúdo do arquivo (forma
    histórica do projeto), **na ordem**.
  - **Script** (`scripts/db-run.mjs`): aplica via conexão direta. Veja
    [§ Aplicando migrations](#11-aplicando-migrations).
- O `git pull`/`push` traz só o **código** — quem cria uma migration precisa
  **aplicá-la no banco** à parte e anotar em `docs/CLAUDE.md`.

## 8. A família "notificações" (atenção: 4 arquivos parecidos)

Esta é a parte com nomes mais confusos. São coisas **diferentes**:

| Arquivo | O que é |
|---|---|
| `lib/notificacoes.ts` | **Toasts de UI** (bus de mensagens "deu certo/erro" na tela). Nada a ver com o banco. |
| `lib/data/notificacoes.ts` | **CRUD do sino** — lê/cria as notificações persistidas (tabela `notificacoes`) pelo navegador. |
| `lib/notificar-eventos.ts` | **Emissores do cliente** — funções de alto nível chamadas em ações do navegador (ex.: `notificarMotoristaDesignado`). Usam `lib/data/notificacoes.ts`. |
| `lib/notificar-server.ts` | **Emissores do servidor** — as rotas `/api/*` (cancelar, substituir, manutenção) inserem notificações direto com o cliente admin. |

Regra mental: *toast de tela* = `lib/notificacoes.ts`; *sininho persistido* =
os outros três (cliente vs. servidor).

## 9. E-mail (dormente)

`lib/email/` tem o pipeline completo (fila `email_outbox` → `dispatcher` →
templates → Resend), mas está **desligado por flag** (ver §10). Enquanto
desligado, nada entra na fila e o cron de `/api/email/dispatch` não envia.

## 10. Flags (`lib/flags.ts`)

Funcionalidades prontas, porém **desligadas** para simplificar a operação:

- `REGISTRO_PAINEL_ATIVO` — check-in/out com foto do painel + km.
- `NOTIFICACOES_EMAIL_ATIVAS` — e-mails via Resend.

Trocar para `true` reativa sem outros ajustes.

## 11. Aplicando migrations

Pré-requisito do script: `SUPABASE_DB_URL` no `.env.local` (connection string
"Session pooler" do painel Supabase). O `pg` já está em devDependencies.

```bash
# 1) Conferir dados que podem bloquear constraints (e a versão do Postgres)
node --env-file=.env.local scripts/db-run.mjs check

# 2) Aplicar uma migration (transação atômica: ou tudo, ou nada)
node --env-file=.env.local scripts/db-run.mjs apply supabase/migrations/0009_integridade.sql

# 3) Conferir que os objetos foram criados
node --env-file=.env.local scripts/db-run.mjs verify
```

> Remova a linha `SUPABASE_DB_URL` (ou troque a senha) quando terminar.

## 12. Convenções importantes

- **Datas/fuso:** o banco usa `timestamptz`; o app trabalha com "hora de parede
  de Lavras" (UTC−3, sem horário de verão). A conversão fica **só nos mappers**
  (`isoLocalParaTimestamptz` / `timestamptzParaIsoLocal`).
- **Tipos do banco** (`lib/supabase/types.ts`) são mantidos **à mão** e usam
  `type` (não `interface`), por compatibilidade com os genéricos do supabase-js.
- **Idempotência:** migrations devem poder ser reaplicadas sem erro
  (`if not exists`, `drop policy ... ; create policy ...`).
- TypeScript strict; nomes de domínio em português (`AgendamentoCard`),
  utilitários em inglês.

## 13. Glossário de domínio

| Termo | Significado |
|---|---|
| **Órgão / Secretaria** | Unidade da prefeitura. Cada usuário/veículo pertence a uma. |
| **Superintendência** | Subdivisão de um órgão. |
| **Função** | Cargo no sistema; define `hierarquia` (menor = mais prioridade) e `nivel_acesso`. |
| **Perfil** | `master` / `gestor` / `servidor` / `motorista` — o papel de acesso. |
| **Hierarquia** | Usada para resolver conflitos de reserva (maior prioridade pode substituir). |
| **Substituição** | Reserva de prioridade superior toma o lugar de outra (o sistema **nunca** realoca sozinho; só informa). |

## 14. "Onde encontro…?"

| Quero… | Vá para |
|---|---|
| uma tela / rota | `app/(dashboard)/<área>/page.tsx` |
| um componente de UI | `components/<área>/` (genéricos em `components/ui/`) |
| uma query ao banco | `lib/data/frota.ts` (+ `manutencoes.ts`, `notificacoes.ts`, `configuracoes.ts`) |
| conversão banco↔app | `lib/data/mappers.ts` |
| estado global de uma entidade | `lib/store/<entidade>-context.tsx` |
| tipos de domínio do app | `lib/mock/types.ts` (apesar do nome "mock", são os tipos reais) |
| dados-semente (seed) | `lib/mock/*` e `supabase/seed.sql` |
| regra de visibilidade de frota | `lib/visibilidade.ts` |
| regras de conflito/CNH/status | `lib/agendamento-utils.ts` |
| schema e segurança do banco | `supabase/migrations/*.sql` |
| operação privilegiada (server) | `app/api/*` e `app/**/actions.ts` |
