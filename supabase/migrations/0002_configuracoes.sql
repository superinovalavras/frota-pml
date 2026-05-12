-- =====================================================================
-- FROTA PML — migration 0002: tabela de configurações do sistema
-- =====================================================================
-- Guarda valores globais (chave/valor) — hoje, a URL da logo personalizada.
-- Como nas demais tabelas da 0001, a RLS começa com política temporária
-- "permitir tudo" e será endurecida na migration 0003 (junto com auth).
--
-- O bucket de Storage `imagens` (público) é criado fora daqui — via script
-- com a service_role key (ver scripts/criar-bucket.mjs). Uploads passam pela
-- rota /api/imagens (server, service_role), então não precisam de política.
-- =====================================================================

create table public.configuracoes (
  chave         text primary key,
  valor         jsonb not null,
  atualizado_em timestamptz not null default now()
);

alter table public.configuracoes enable row level security;

create policy "tmp_all_configuracoes"
  on public.configuracoes for all using (true) with check (true);
