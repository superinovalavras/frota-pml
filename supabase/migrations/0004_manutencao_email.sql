-- =====================================================================
-- FROTA PML — migration 0004: manutenção de veículo + fila de emails
-- =====================================================================
-- Acrescenta:
--   * tabela `manutencoes` — registra cada janela de manutenção de um
--     veículo, com motivo e previsão de retorno (data).
--   * tabela `email_outbox` — fila de notificações por email. A escrita
--     é feita por rotas server (service_role), o processador lê e envia.
--
-- Pré-requisito: migrations 0001..0003 já aplicadas.
-- Idempotente: tabelas/índices com `if not exists`, políticas com
-- `drop policy if exists` antes do `create`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- MANUTENÇÕES
-- ---------------------------------------------------------------------
create table if not exists public.manutencoes (
  id                 text primary key default public.novo_id(),
  veiculo_id         text not null references public.veiculos(id) on delete cascade,
  motivo             text not null,
  previsao_retorno   date not null,
  criado_por         text references public.profiles(id) on delete set null,
  criado_em          timestamptz not null default now(),
  encerrado_em       timestamptz
);
create index if not exists idx_manutencoes_veiculo on public.manutencoes(veiculo_id);
create index if not exists idx_manutencoes_ativa on public.manutencoes(veiculo_id) where encerrado_em is null;

-- Garante que existe no máximo uma manutenção ATIVA por veículo.
create unique index if not exists uniq_manutencao_ativa_por_veiculo
  on public.manutencoes(veiculo_id)
  where encerrado_em is null;

-- ---------------------------------------------------------------------
-- EMAIL OUTBOX (fila de notificações)
-- ---------------------------------------------------------------------
create table if not exists public.email_outbox (
  id                       text primary key default public.novo_id(),
  tipo_evento              text not null
                             check (tipo_evento in (
                               'manutencao_veiculo',
                               'agendamento_cancelado',
                               'passageiro_adicionado',
                               'passageiro_removido'
                             )),
  destinatario_email       text not null,
  destinatario_nome        text not null default '',
  destinatario_profile_id  text references public.profiles(id) on delete set null,
  assunto                  text not null default '',
  payload                  jsonb not null default '{}'::jsonb,
  corpo_html               text,
  corpo_texto              text,
  status                   text not null default 'pendente'
                             check (status in ('pendente','enviando','enviado','falhou')),
  tentativas               int  not null default 0,
  erro_ultimo              text,
  claimed_em               timestamptz,
  agendamento_id           text references public.agendamentos(id) on delete set null,
  veiculo_id               text references public.veiculos(id) on delete set null,
  criado_em                timestamptz not null default now(),
  enviado_em               timestamptz
);
create index if not exists idx_email_outbox_status_criado on public.email_outbox(status, criado_em)
  where status = 'pendente';
create index if not exists idx_email_outbox_agendamento on public.email_outbox(agendamento_id);
create index if not exists idx_email_outbox_veiculo on public.email_outbox(veiculo_id);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.manutencoes  enable row level security;
alter table public.email_outbox enable row level security;

-- ---------------------------------------------------------------------
-- manutencoes: SELECT herda a visibilidade do veículo. WRITE só master ou
-- gestor da secretaria do veículo.
-- ---------------------------------------------------------------------
drop policy if exists "sel_manutencoes" on public.manutencoes;
create policy "sel_manutencoes" on public.manutencoes
  for select to authenticated using (
    veiculo_id in (select id from public.veiculos)
  );

drop policy if exists "wr_manutencoes" on public.manutencoes;
create policy "wr_manutencoes" on public.manutencoes
  for all to authenticated
  using (
    public.eh_master()
    or (
      public.meu_perfil() = 'gestor'
      and exists (
        select 1 from public.veiculos v
        where v.id = manutencoes.veiculo_id
          and v.secretaria_id = public.minha_secretaria()
      )
    )
  )
  with check (
    public.eh_master()
    or (
      public.meu_perfil() = 'gestor'
      and exists (
        select 1 from public.veiculos v
        where v.id = manutencoes.veiculo_id
          and v.secretaria_id = public.minha_secretaria()
      )
    )
  );

-- ---------------------------------------------------------------------
-- email_outbox: leitura só pelo Master (auditoria). Escrita só por
-- service_role (a RLS bloqueia clientes autenticados — as APIs server
-- usam a chave admin, que ignora RLS).
-- ---------------------------------------------------------------------
drop policy if exists "sel_email_outbox_master" on public.email_outbox;
create policy "sel_email_outbox_master" on public.email_outbox
  for select to authenticated using (public.eh_master());
