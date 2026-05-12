# FROTA PML — Gestão e Agendamento da Frota Municipal

Sistema web para a Prefeitura Municipal de Lavras gerir e agendar os veículos
da frota: cadastro de veículos, usuários e funções (hierarquia), reservas com
controle de conflito, agenda visual, check-in/out e relatórios.

Escopo completo: `docs/Gestao_Veiculos_Lavras_v1.docx` · Tutorial: `docs/FROTA-PML-Documentacao-e-Tutorial.docx`

## Stack

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS 4** + shadcn/ui (Radix)
- **Supabase** — Postgres, Auth, Storage, RLS
- Hospedagem prevista: **Vercel** (frontend) + **Supabase** (backend), planos gratuitos

> ⚠️ Esta versão do Next.js tem mudanças relevantes em relação a versões
> anteriores — consulte `node_modules/next/dist/docs/` antes de escrever código.

## Rodando localmente

1. `npm install`
2. Crie `.env.local` a partir de `.env.local.example` e preencha as chaves do
   Supabase (painel → Settings → API Keys):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a "Publishable key", `sb_publishable_...`)
   - `SUPABASE_SERVICE_ROLE_KEY` (a "Secret key", `sb_secret_...`) — **segredo**, só servidor
3. `npm run dev` → http://localhost:3000

### Banco de dados

As migrations estão em `supabase/migrations/`. Hoje aplicam-se pelo **SQL Editor**
do painel (copiar/colar o conteúdo, na ordem). Quando a Supabase CLI estiver
configurada (`supabase link`), dá para usar `supabase db push` / `supabase db reset`.

| Arquivo | O quê |
|---|---|
| `0001_schema.sql` | tabelas principais + RLS temporária ("permitir tudo") |
| `0002_configuracoes.sql` | tabela `configuracoes` (chave/valor — ex.: logo) |
| `0003_rls.sql` | **RLS real** por perfil/secretaria + trigger de status. ⚠️ aplicar só depois que o login estiver validado (ver cabeçalho do arquivo) |
| `seed.sql` | dados-semente (secretarias, funções, usuários, veículos) |

Scripts auxiliares (rodar com `node --env-file=.env.local scripts/<arquivo>`):
- `scripts/criar-bucket.mjs` — cria o bucket público `imagens` no Storage
- `scripts/criar-usuarios-auth.mjs` — cria os usuários de autenticação para os
  perfis e grava `auth_user_id` (senha padrão provisória — orientar a trocar)

### Autenticação

Login por **CPF, MASP ou e-mail** + senha (`/login`). Os perfis ficam em
`profiles` e são vinculados 1:1 a um usuário do Supabase Auth (`auth_user_id`)
no primeiro login. Ninguém se cadastra sozinho — o Master cria os usuários.

Enquanto a migration `0003` não está aplicada, há um **modo demonstração**
(botão no login) que abre o sistema sem sessão; o seletor no topo alterna
entre os perfis simulados.

## Estrutura

```
app/                # rotas (App Router)
  (auth)/login/     # login + server action
  (dashboard)/      # rotas autenticadas (agenda, agendamentos, veículos, ...)
  api/              # route handlers (upload de imagem, keep-alive)
components/         # componentes de UI e de domínio
lib/
  supabase/         # clientes (browser/server/admin) + tipos do banco
  data/             # acesso a dados (queries) + mappers snake_case<->camelCase
  storage/          # upload de imagens
  store/            # contextos React (veículos, agendamentos, usuários, ...)
  mock/             # tipos de domínio + dados-semente (origem do seed.sql)
supabase/           # migrations + seed
scripts/            # utilitários (bucket, usuários de auth, geração de docs)
docs/               # escopo e tutorial
```

## Estado / próximos passos

Ver `docs/CLAUDE.md` (seção "Fase atual"). Resumido: o backend Supabase está
conectado (dados, fotos, login). Falta endurecer a RLS (aplicar `0003`),
auto-edição de "Meu perfil", regra de conflito por hierarquia + notificações,
e integrações opcionais (e-mail, Google Calendar, OCR do odômetro).
