-- =====================================================================
-- FROTA PML — migration 0007: notificações internas (sino no app)
-- =====================================================================
-- Central de notificações exibida no sino da topbar. Cada linha é uma
-- notificação para UM destinatário. Substitui (por ora) as notificações
-- por email, que estão dormentes (lib/flags.ts).
--
-- Eventos previstos (campo `tipo`):
--   motorista_designado, reserva_confirmada, reserva_cancelada,
--   reserva_substituida, veiculo_manutencao, veiculo_liberado,
--   passageiro_adicionado, passageiro_removido
--
-- Idempotente: seguro reaplicar.
-- =====================================================================

create table if not exists public.notificacoes (
  id              text primary key default public.novo_id(),
  destinatario_id text not null references public.profiles(id) on delete cascade,
  tipo            text not null,
  titulo          text not null,
  mensagem        text not null default '',
  -- referências opcionais para navegar a partir da notificação:
  agendamento_id  text references public.agendamentos(id) on delete set null,
  veiculo_id      text references public.veiculos(id) on delete set null,
  lida            boolean not null default false,
  criado_em       timestamptz not null default now()
);
create index if not exists idx_notificacoes_destinatario
  on public.notificacoes(destinatario_id, lida, criado_em desc);

alter table public.notificacoes enable row level security;

-- Cada um lê/atualiza/apaga apenas as PRÓPRIAS notificações.
drop policy if exists "sel_notificacoes" on public.notificacoes;
create policy "sel_notificacoes" on public.notificacoes
  for select to authenticated using (destinatario_id = public.meu_profile_id());

drop policy if exists "upd_notificacoes" on public.notificacoes;
create policy "upd_notificacoes" on public.notificacoes
  for update to authenticated
  using (destinatario_id = public.meu_profile_id())
  with check (destinatario_id = public.meu_profile_id());

drop policy if exists "del_notificacoes" on public.notificacoes;
create policy "del_notificacoes" on public.notificacoes
  for delete to authenticated using (destinatario_id = public.meu_profile_id());

-- INSERT: qualquer autenticado pode criar notificação para outra pessoa
-- (ex.: ao designar um motorista, o app do solicitante cria a notificação
-- do motorista). Conteúdo não é sensível; rotas server usam service_role.
drop policy if exists "ins_notificacoes" on public.notificacoes;
create policy "ins_notificacoes" on public.notificacoes
  for insert to authenticated with check (true);
