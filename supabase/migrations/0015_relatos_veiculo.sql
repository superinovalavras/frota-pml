-- 0015_relatos_veiculo.sql
-- Ocorrências / defeitos relatados por veículo (o "Ocorrências e Defeitos" do
-- papel). Qualquer usuário relata (carro + texto; data e autor automáticos);
-- master/gestor marcam "resolvido". Histórico datado e nominal = prova de que
-- o defeito foi avisado antes. Aditiva.

create table if not exists public.relatos_veiculo (
  id            text primary key default public.novo_id(),
  veiculo_id    text not null references public.veiculos(id) on delete cascade,
  autor_id      text references public.profiles(id) on delete set null,
  descricao     text not null,
  resolvido     boolean not null default false,
  resolvido_por text references public.profiles(id) on delete set null,
  resolvido_em  timestamptz,
  criado_em     timestamptz not null default now()
);
create index if not exists idx_relatos_veiculo
  on public.relatos_veiculo (veiculo_id, criado_em desc);

alter table public.relatos_veiculo enable row level security;

-- Leitura: qualquer autenticado (defeito é info operacional).
drop policy if exists "sel_relatos" on public.relatos_veiculo;
create policy "sel_relatos" on public.relatos_veiculo
  for select to authenticated using (true);

-- Relatar: qualquer autenticado, como si mesmo.
drop policy if exists "ins_relatos" on public.relatos_veiculo;
create policy "ins_relatos" on public.relatos_veiculo
  for insert to authenticated
  with check (autor_id = public.meu_profile_id());

-- Resolver: master ou gestor.
drop policy if exists "upd_relatos" on public.relatos_veiculo;
create policy "upd_relatos" on public.relatos_veiculo
  for update to authenticated
  using (public.eh_master() or public.meu_perfil() = 'gestor')
  with check (public.eh_master() or public.meu_perfil() = 'gestor');

-- Excluir: só master.
drop policy if exists "del_relatos" on public.relatos_veiculo;
create policy "del_relatos" on public.relatos_veiculo
  for delete to authenticated using (public.eh_master());
