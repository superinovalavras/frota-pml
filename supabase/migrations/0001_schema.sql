-- =====================================================================
-- FROTA PML — Schema inicial (Fase 2)
-- =====================================================================
-- Convenções:
--  * Tabelas e colunas em snake_case.
--  * IDs como TEXT: aceitam tanto os "slugs" do seed (ex.: "sec-saude")
--    quanto UUIDs gerados pelo banco para registros novos.
--  * RLS é ativada em todas as tabelas. Nesta migration são criadas
--    políticas TEMPORÁRIAS "permitir tudo" — elas serão substituídas
--    pelas políticas reais (por perfil/secretaria) na migration 0003,
--    junto com a integração de autenticação.
-- =====================================================================

-- Função utilitária: gera um id text (uuid) para registros novos.
create or replace function public.novo_id() returns text
  language sql volatile as $$ select gen_random_uuid()::text $$;

-- ---------------------------------------------------------------------
-- ÓRGÃOS (secretarias / gabinetes / lotações)
-- ---------------------------------------------------------------------
create table public.secretarias (
  id          text primary key default public.novo_id(),
  nome        text not null,
  sigla       text not null,
  criado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- SUPERINTENDÊNCIAS (subdivisões de um órgão)
-- ---------------------------------------------------------------------
create table public.superintendencias (
  id            text primary key default public.novo_id(),
  nome          text not null,
  sigla         text not null,
  secretaria_id text not null references public.secretarias(id) on delete cascade,
  criado_em     timestamptz not null default now()
);
create index idx_superintendencias_secretaria on public.superintendencias(secretaria_id);

-- ---------------------------------------------------------------------
-- FUNÇÕES (define hierarquia + nível de acesso técnico)
-- ---------------------------------------------------------------------
create table public.funcoes (
  id            text primary key default public.novo_id(),
  nome          text not null,
  hierarquia    int  not null,                    -- menor = maior prioridade
  nivel_acesso  text not null check (nivel_acesso in ('master','gestor','servidor')),
  sistema       boolean not null default false,   -- função de sistema (não excluível)
  eh_motorista  boolean not null default false,   -- entra no pool de motoristas
  eh_master     boolean not null default false,   -- a função Master única
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PERFIS / USUÁRIOS
--  * auth_user_id: vínculo (1:1) com auth.users — preenchido quando a
--    pessoa faz o primeiro login. Fica nullable até lá (e para os
--    usuários seed da demonstração).
-- ---------------------------------------------------------------------
create table public.profiles (
  id                   text primary key default public.novo_id(),
  auth_user_id         uuid unique references auth.users(id) on delete set null,
  nome                 text not null,
  cpf                  text not null default '',
  masp                 text not null default '',
  email                text not null default '',
  cargo                text not null default '',
  funcao_id            text not null references public.funcoes(id),
  -- campos derivados de funcoes (mantidos para consultas rápidas / RLS):
  perfil               text not null check (perfil in ('master','gestor','servidor','motorista')),
  hierarquia           int  not null default 999,
  secretaria_id        text not null references public.secretarias(id),
  superintendencia_id  text references public.superintendencias(id) on delete set null,
  telefone             text not null default '',
  cnh_categoria        text,                       -- 'A','B','C','D','E','AB','AC','AD','AE'
  cnh_numero           text,
  cnh_validade         date,
  foto_url             text,
  criado_em            timestamptz not null default now()
);
create index idx_profiles_secretaria on public.profiles(secretaria_id);
create index idx_profiles_superintendencia on public.profiles(superintendencia_id);
create index idx_profiles_funcao on public.profiles(funcao_id);
create index idx_profiles_auth_user on public.profiles(auth_user_id);

-- ---------------------------------------------------------------------
-- VEÍCULOS
-- ---------------------------------------------------------------------
create table public.veiculos (
  id                   text primary key default public.novo_id(),
  placa                text not null,
  modelo               text not null default '',
  marca                text not null default '',
  ano                  int  not null default extract(year from now())::int,
  cor                  text not null default '',
  cnh_exigida          text not null default 'B',
  secretaria_id        text not null references public.secretarias(id),
  superintendencia_id  text references public.superintendencias(id) on delete set null,
  status               text not null default 'disponivel'
                         check (status in ('disponivel','em_uso','manutencao','indisponivel')),
  km_atual             int  not null default 0,
  observacoes          text,
  foto_url             text,
  criado_em            timestamptz not null default now()
);
create index idx_veiculos_secretaria on public.veiculos(secretaria_id);
create index idx_veiculos_superintendencia on public.veiculos(superintendencia_id);

-- ---------------------------------------------------------------------
-- AGENDAMENTOS (reservas de veículo)
--  * passageiros: JSONB — array de { tipo:'usuario', usuario_id } | { tipo:'convidado', nome, motivo }
-- ---------------------------------------------------------------------
create table public.agendamentos (
  id               text primary key default public.novo_id(),
  veiculo_id       text not null references public.veiculos(id) on delete restrict,
  solicitante_id   text not null references public.profiles(id) on delete restrict,
  motorista_id     text references public.profiles(id) on delete set null,
  inicio           timestamptz not null,
  fim              timestamptz not null,
  dia_todo         boolean not null default false,
  local_partida    text not null default '',
  local_devolucao  text not null default '',
  destino          text not null default '',
  finalidade       text not null default '',
  passageiros      jsonb not null default '[]'::jsonb,
  status           text not null default 'pendente'
                     check (status in ('pendente','confirmado','em_andamento','concluido','cancelado','substituido')),
  observacoes      text,
  -- registro de check-in (saída):
  checkin_em       timestamptz,
  km_saida         int,
  foto_saida_url   text,
  obs_saida        text,
  -- registro de check-out (retorno):
  checkout_em      timestamptz,
  km_retorno       int,
  foto_retorno_url text,
  obs_retorno      text,
  criado_em        timestamptz not null default now(),
  check (fim >= inicio)
);
create index idx_agendamentos_veiculo on public.agendamentos(veiculo_id);
create index idx_agendamentos_solicitante on public.agendamentos(solicitante_id);
create index idx_agendamentos_motorista on public.agendamentos(motorista_id);
create index idx_agendamentos_inicio on public.agendamentos(inicio);
create index idx_agendamentos_status on public.agendamentos(status);

-- =====================================================================
-- RLS — ativar em todas as tabelas
-- =====================================================================
alter table public.secretarias        enable row level security;
alter table public.superintendencias  enable row level security;
alter table public.funcoes            enable row level security;
alter table public.profiles           enable row level security;
alter table public.veiculos           enable row level security;
alter table public.agendamentos       enable row level security;

-- ⚠️ POLÍTICAS TEMPORÁRIAS — "permitir tudo".
-- Serão removidas e substituídas pelas políticas reais (por perfil e
-- secretaria) na migration 0003, junto com a integração de auth.
-- Enquanto isso, o app continua funcionando com a anon key.
create policy "tmp_all_secretarias"       on public.secretarias       for all using (true) with check (true);
create policy "tmp_all_superintendencias" on public.superintendencias for all using (true) with check (true);
create policy "tmp_all_funcoes"           on public.funcoes           for all using (true) with check (true);
create policy "tmp_all_profiles"          on public.profiles          for all using (true) with check (true);
create policy "tmp_all_veiculos"          on public.veiculos          for all using (true) with check (true);
create policy "tmp_all_agendamentos"      on public.agendamentos      for all using (true) with check (true);
