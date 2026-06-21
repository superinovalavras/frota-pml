# Sistema de Gestão de Veículos — Prefeitura Municipal de Lavras

## Contexto do Projeto

Aplicação web para gestão e agendamento de veículos da Prefeitura Municipal de Lavras.
Substitui um processo inteiramente verbal e informal por uma plataforma digital centralizada, segura e auditável.

Documento de escopo completo: `docs/Gestao_Veiculos_Lavras_v1.docx`

---

## Stack Tecnológica

- **Frontend:** Next.js (App Router) + Tailwind CSS + shadcn/ui
- **Backend/BaaS:** Supabase (banco de dados PostgreSQL, autenticação, RLS, realtime) — **fase 2**
- **Calendário:** Google Calendar API via Service Account — **fase 2**
- **Armazenamento de fotos:** Google Drive institucional via Service Account — **fase 2**
- **OCR:** (a definir — fase 2)
- **Hospedagem:** (a definir)

> ⚠️ Se a stack mudar, atualize esta seção antes de continuar o desenvolvimento.

---

## Estrutura de Pastas

```
/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Rotas de login
│   ├── (dashboard)/        # Rotas protegidas
│   │   ├── agenda/
│   │   ├── agendamentos/
│   │   ├── veiculos/
│   │   ├── motoristas/
│   │   ├── relatorios/
│   │   └── admin/
├── components/
├── lib/
│   ├── supabase/           # Cliente e helpers do Supabase
│   ├── google/             # Google Calendar e Drive helpers
│   └── ocr/                # Integração OCR
├── supabase/
│   ├── migrations/         # Migrations SQL
│   └── seed.sql
└── docs/                   # Documentos de escopo e referência
```

---

## Perfis de Acesso (RBAC)

| Perfil | Descrição |
|---|---|
| `master` | Acesso irrestrito. Cadastra usuários, veículos e motoristas |
| `gestor` | Acesso aos dados e relatórios da própria secretaria |
| `servidor` | Realiza agendamentos, check-in e check-out |
| `motorista` | Pode ser associado a agendamentos. Cadastrado pelo Master |

**Regra crítica:** Nenhum usuário se cadastra por conta própria. Todo cadastro é feito pelo Master.

---

## Regras de Negócio Críticas

### Visibilidade de frota
- Cada usuário enxerga **apenas** os veículos da sua secretaria + frota geral da Prefeitura
- Veículos de outras secretarias são **invisíveis**

### Conflitos de agendamento
1. Dois servidores tentam o mesmo veículo ao mesmo tempo → o de **maior hierarquia** ganha
2. Servidor de hierarquia superior quer veículo já reservado:
   - Recebe alerta com nome, cargo e contato de quem reservou
   - Pode confirmar (substitui) ou desistir
   - Se confirmar: quem perdeu recebe e-mail educado + status atual da frota
3. **O sistema NUNCA realoca veículo automaticamente** — apenas informa

### Hierarquia por secretaria
- Cada secretaria tem sua própria ordem de prioridade entre cargos
- Configurada manualmente durante a implantação
- Armazenada no banco e usada para resolver conflitos

### Check-in / Check-out
- Servidor fotografa o painel (odômetro)
- OCR extrai quilometragem automaticamente
- Servidor confirma o valor antes de salvar
- Foto é salva no Google Drive com nome padronizado: `{secretaria}_{servidor}_{data_hora}`
- Offline: foto e metadados EXIF armazenados localmente, sincronizados quando houver conexão

---

## Autenticação

Login aceita qualquer um dos três identificadores:
- CPF
- E-mail cadastrado
- MASP (Matrícula do Servidor Público)

Usar autenticação do Supabase com campo customizado para CPF e MASP na tabela `profiles`.

---

## Notificações (por e-mail + Google Calendar)

Eventos que disparam notificação:
1. Confirmação de agendamento
2. Lembrete antes do horário de saída
3. Agendamento substituído por hierarquia superior (+ status da frota)
4. Veículo colocado em manutenção (+ alternativas disponíveis)
5. Veículo liberado da manutenção

---

## Google Calendar

- Cada veículo tem seu **próprio calendário** no Google Calendar
- Agendamentos aparecem como eventos espelhados
- Convites são enviados por e-mail ao servidor
- **Toda a lógica permanece no Supabase** — o Calendar é apenas leitura/espelho
- Usar Service Account para gerenciar calendários sem interação manual

---

## Dashboard Analítico

Acessos:
- `master`: dados de todas as secretarias
- `gestor`: apenas sua secretaria

Métricas disponíveis:
- Quilometragem por veículo (dia / semana / mês / ano)
- Número de viagens e taxa de ocupação por período
- Histórico completo de agendamentos
- Uso por servidor (frequência, KM acumulado, horários)
- Servidores que mais utilizam
- Períodos de maior demanda (hora e dia da semana)

---

## Banco de Dados (Supabase)

Tabelas principais (a detalhar nas migrations):

- `profiles` — usuários com cargo, secretaria, CPF, MASP, e-mail
- `secretarias` — unidades da prefeitura
- `veiculos` — frota com status e CNH exigida
- `motoristas` — cadastro separado de motoristas
- `agendamentos` — reservas com todos os dados da viagem
- `checkins` / `checkouts` — registros de quilometragem com foto
- `hierarquias` — prioridade de cargos por secretaria
- `notificacoes` — log de notificações enviadas

**RLS (Row Level Security) é obrigatório** — todas as tabelas devem ter políticas de acesso baseadas no perfil e secretaria do usuário autenticado.

---

## Convenções de Código

- TypeScript em todo o projeto (strict mode)
- Componentes em português quando forem de domínio do negócio (ex: `AgendamentoCard`)
- Utilitários e hooks em inglês (ex: `useSupabaseClient`)
- Variáveis de ambiente: nunca hardcode de chaves de API
- Sempre usar Server Components do Next.js por padrão; Client Components apenas quando necessário
- Queries ao Supabase centralizadas em `lib/supabase/queries/`

---

## Estado atual — OPERACIONAL (em produção)

Produção: **https://frota-pml.vercel.app** (Vercel) + Supabase
(projeto `rjdfzpvqevdswumdlgnr`, org superinovalavras). GitHub:
`superinovalavras/frota-pml`.

### Já funciona
- **Auth + RLS real**: login por CPF/MASP/e-mail; RLS por perfil/secretaria
  (migrations 0003/0006). `profiles.auth_user_id` liga o perfil à conta.
- **Login obrigatório**: o `proxy.ts`/middleware redireciona sem sessão para
  `/login`. **Modo demonstração foi REMOVIDO.** Após login há uma tela
  "Carregando o sistema…" (`GateCarregando`) até sessão+dados prontos.
- **Agenda** semanal (desktop) e **grade de 7 dias responsiva no celular**;
  foto do veículo como fundo do bloco; "dia todo" ocupa a coluna; filtro por
  veículo.
- **Reservas**: criação, conflito de horário, **substituição por hierarquia**
  (estritamente maior; empate não tira a vaga) com alternativas livres da frota.
  Só o **Master** agenda em nome de outro; gestor/servidor só pra si.
- **Hierarquia de funções com empate** (aba Admin › Hierarquia).
- **Check-in/out** simplificado (sem foto/km) — dormente atrás de flag.
- **Manutenção**: tira o veículo da lista, cancela reservas afetadas e
  **notifica todos os usuários** (entra e sai).
- **Sino de notificações** (tabela `notificacoes`, migration 0007): motorista
  designado, reserva confirmada/cancelada/substituída, manutenção entra/sai,
  passageiro incluído/removido. Polling 60s.
- **Motoristas**: pool = função Motorista **ou** qualquer servidor com CNH
  válida. Master cadastra motorista direto na aba (mesma base de usuários).
- **Usuários**: Master cria/edita via `salvarUsuarioAdmin` (server action) que
  **cria a conta de login no Supabase Auth** e **sincroniza o e-mail** com o
  Auth. Auto-edição ampla do próprio perfil (nome, CPF, MASP, e-mail, cargo,
  foto, telefone, CNH) — função/órgão/superintendência seguem Master-only.
- **Trocar senha** própria (Meu perfil), mínimo 6 (padrão do Supabase Auth).
- **Relatórios** com filtros por veículo, usuário e órgão.
- **Marca**: logo personalizada (PNG, círculo) com reenquadrar.

### Flags (funcionalidades dormentes) — `lib/flags.ts`
- `REGISTRO_PAINEL_ATIVO = false` — check-in/out sem foto/km (a portaria anota).
- `NOTIFICACOES_EMAIL_ATIVAS = false` — e-mail (Resend) desligado; no lugar,
  telefone de contato aparece nas reservas. Trocar p/ `true` reativa tudo.

### Migrations (aplicadas manualmente no SQL Editor, em ordem)
`0001`..`0007` **aplicadas em produção**. **`0008` (coluna `veiculos.lugares`)
ainda NÃO foi aplicada** e o commit do código de "lugares" está **só local
(não no GitHub)** — aplicar a 0008 antes de dar push, senão salvar veículo
quebra (o mapper grava `lugares`). SQL:
`alter table public.veiculos add column if not exists lugares int not null default 5;`

### Operacional
- Senha padrão de contas criadas: `Frota@Lavras2026` — **orientar a trocar**.
- `vercel.json` tem cron diário em `/api/keep-alive` (Supabase não pausar) e
  `/api/email/dispatch` (protegido por `CRON_SECRET`, inerte enquanto e-mail off).

### Pendências / futuro (não bloqueiam o uso)
- Aplicar a migration 0008 + push do código de lugares (acima).
- Hierarquia hoje é **global** (o escopo previa por-secretaria) — evolução.
- Lembrete antes da viagem (precisa job agendado).
- Google Calendar (espelho) e OCR do odômetro — futuras.

---

## Onboarding / handoff (rodar em outra máquina/conta)

O projeto vive em **GitHub + Supabase + Vercel** (conta superinovalavras), não
no Claude. Para continuar em outra máquina/conta:

1. `git clone https://github.com/superinovalavras/frota-pml.git` + `npm install`.
2. Recriar **`.env.local`** (não vai no git — ver `.env.local.example`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable),
   `SUPABASE_SERVICE_ROLE_KEY` (secret, só servidor), `RESEND_API_KEY`,
   `EMAIL_REMETENTE`, `CRON_SECRET`. As mesmas chaves estão no Vercel.
3. `npm run dev` → http://localhost:3000 (precisa de login real; sem modo demo).
4. Migrations: aplicar pelo **SQL Editor** do Supabase, em ordem. As funções da
   RLS (`meu_profile_id()`, `eh_master()`, etc.) vêm da 0003.
5. Deploy: push na `master` → Vercel faz deploy automático.

---

## Notas para o Claude

- Antes de criar qualquer componente de UI, verifique se já existe algo equivalente em `components/`.
- Acesso ao banco: centralizar em `lib/data/` (não chamar `supabaseBrowser()` espalhado pelas telas).
- Tipos do banco em `lib/supabase/types.ts` são mantidos à mão — usar `type`, não `interface` (compatibilidade com os genéricos do supabase-js).
- Datas de agendamento: o banco usa `timestamptz`; o app trabalha com "hora de parede de Lavras" (UTC−3, sem horário de verão). A conversão fica nos mappers (`lib/data/mappers.ts`).
- Ao mexer em RLS, sempre testar com usuários de diferentes perfis.
- OCR (quando voltar ao escopo) pode falhar — sempre permitir edição manual do valor extraído.
- Quando houver dúvida sobre regra de negócio, consulte `docs/Gestao_Veiculos_Lavras_v1.docx`.
