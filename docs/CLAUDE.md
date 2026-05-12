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

## Fase Atual

**Fase 2 — Integração com o Supabase, rumo a operacional.**

A Fase 1 (frontend com mock data) está concluída. Agora:

Feito (Fase 2a/2b):
- Supabase conectado: clientes em `lib/supabase/`, acesso a dados em `lib/data/`.
- Contextos (`orgaos`, `funcoes`, `usuarios`, `veiculos`, `agendamentos`, `branding`)
  leem/gravam no Supabase em vez de localStorage.
- Fotos (veículo, perfil, logo) vão para o Supabase Storage (bucket `imagens`),
  via a rota `/api/imagens`.
- Login real (CPF/MASP/e-mail + senha) com Supabase Auth; `profiles.auth_user_id`
  vincula o perfil à conta. O "modo demonstração" (seletor de perfil) segue
  disponível enquanto a RLS não estiver endurecida.
- `middleware.ts` renova a sessão.

Pendente:
- Aplicar a migration `0003_rls.sql` (RLS real por perfil/secretaria + trigger
  que sincroniza `veiculos.status`). Só depois de validar o login. Quando
  aplicada, o "modo demonstração" deixa de ver dados.
- Auto-edição de "Meu perfil" (server action que restringe colunas).
- Regra de conflito por hierarquia (substitui + notifica) — hoje só há detecção
  de sobreposição em `lib/agendamento-utils.ts`.
- Tabela `notificacoes` + envio de e-mail.
- Superintendências ainda vêm de `lib/mock/superintendencias.ts` (estático) em
  vários componentes; o banco já tem os dados.
- Integrações opcionais (não bloqueiam o "operacional"): Google Calendar
  (espelho de eventos), OCR do odômetro no check-in. Offline no check-in fica
  para uma atualização futura.

Hospedagem alvo: Vercel + Supabase (planos gratuitos). Há `vercel.json` com um
cron diário em `/api/keep-alive` para o projeto Supabase não pausar.

---

## Notas para o Claude

- Antes de criar qualquer componente de UI, verifique se já existe algo equivalente em `components/`.
- Acesso ao banco: centralizar em `lib/data/` (não chamar `supabaseBrowser()` espalhado pelas telas).
- Tipos do banco em `lib/supabase/types.ts` são mantidos à mão — usar `type`, não `interface` (compatibilidade com os genéricos do supabase-js).
- Datas de agendamento: o banco usa `timestamptz`; o app trabalha com "hora de parede de Lavras" (UTC−3, sem horário de verão). A conversão fica nos mappers (`lib/data/mappers.ts`).
- Ao mexer em RLS, sempre testar com usuários de diferentes perfis.
- OCR (quando voltar ao escopo) pode falhar — sempre permitir edição manual do valor extraído.
- Quando houver dúvida sobre regra de negócio, consulte `docs/Gestao_Veiculos_Lavras_v1.docx`.
