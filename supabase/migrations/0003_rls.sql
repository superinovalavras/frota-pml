-- =====================================================================
-- FROTA PML — migration 0003: RLS real (por perfil e secretaria)
-- =====================================================================
-- ⚠️ PRÉ-REQUISITOS — leia antes de aplicar:
--   1. O login com Supabase Auth precisa estar funcionando e os perfis
--      precisam ter `auth_user_id` preenchido (rode scripts/criar-usuarios-auth.mjs).
--   2. Depois de aplicar esta migration, o "modo demonstração" (sem login)
--      deixa de ver os dados — a anon key sem sessão fica sem acesso.
--      Ou seja: aplique só quando o login estiver validado.
--   3. Esta migration substitui as políticas temporárias "permitir tudo"
--      das migrations 0001/0002.
--   4. Inclui um trigger que mantém `veiculos.status` (em_uso/disponivel) em
--      sincronia com os agendamentos — assim a regra não depende mais do
--      `useEffect` no cliente (que, com a RLS, não conseguiria escrever).
--
-- Idempotente: funções via `create or replace` e cada política com
-- `drop policy if exists` antes do `create` — seguro reaplicar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funções auxiliares (security definer: leem `profiles` sem recursão de RLS)
-- ---------------------------------------------------------------------
create or replace function public.meu_profile_id() returns text
  language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1 $$;

create or replace function public.meu_perfil() returns text
  language sql stable security definer set search_path = public as $$
  select perfil from public.profiles where auth_user_id = auth.uid() limit 1 $$;

create or replace function public.eh_master() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(
    (select perfil = 'master' from public.profiles where auth_user_id = auth.uid() limit 1),
    false) $$;

create or replace function public.minha_secretaria() returns text
  language sql stable security definer set search_path = public as $$
  select secretaria_id from public.profiles where auth_user_id = auth.uid() limit 1 $$;

create or replace function public.minha_superintendencia() returns text
  language sql stable security definer set search_path = public as $$
  select superintendencia_id from public.profiles where auth_user_id = auth.uid() limit 1 $$;

-- ---------------------------------------------------------------------
-- Remover as políticas temporárias
-- ---------------------------------------------------------------------
drop policy if exists "tmp_all_secretarias"       on public.secretarias;
drop policy if exists "tmp_all_superintendencias" on public.superintendencias;
drop policy if exists "tmp_all_funcoes"           on public.funcoes;
drop policy if exists "tmp_all_profiles"          on public.profiles;
drop policy if exists "tmp_all_veiculos"          on public.veiculos;
drop policy if exists "tmp_all_agendamentos"      on public.agendamentos;
drop policy if exists "tmp_all_configuracoes"     on public.configuracoes;

-- ---------------------------------------------------------------------
-- Dados de referência: leitura para qualquer autenticado, escrita só Master
-- ---------------------------------------------------------------------
drop policy if exists "sel_secretarias" on public.secretarias;
create policy "sel_secretarias" on public.secretarias
  for select to authenticated using (true);
drop policy if exists "wr_secretarias" on public.secretarias;
create policy "wr_secretarias" on public.secretarias
  for all to authenticated using (public.eh_master()) with check (public.eh_master());

drop policy if exists "sel_superintendencias" on public.superintendencias;
create policy "sel_superintendencias" on public.superintendencias
  for select to authenticated using (true);
drop policy if exists "wr_superintendencias" on public.superintendencias;
create policy "wr_superintendencias" on public.superintendencias
  for all to authenticated using (public.eh_master()) with check (public.eh_master());

drop policy if exists "sel_funcoes" on public.funcoes;
create policy "sel_funcoes" on public.funcoes
  for select to authenticated using (true);
drop policy if exists "wr_funcoes" on public.funcoes;
create policy "wr_funcoes" on public.funcoes
  for all to authenticated using (public.eh_master()) with check (public.eh_master());

drop policy if exists "sel_configuracoes" on public.configuracoes;
create policy "sel_configuracoes" on public.configuracoes
  for select to authenticated using (true);
drop policy if exists "wr_configuracoes" on public.configuracoes;
create policy "wr_configuracoes" on public.configuracoes
  for all to authenticated using (public.eh_master()) with check (public.eh_master());

-- ---------------------------------------------------------------------
-- profiles: vê o próprio + os da mesma secretaria; Master vê todos.
-- ---------------------------------------------------------------------
drop policy if exists "sel_profiles" on public.profiles;
create policy "sel_profiles" on public.profiles
  for select to authenticated using (
    public.eh_master()
    or auth_user_id = auth.uid()
    or secretaria_id = public.minha_secretaria()
  );
drop policy if exists "wr_profiles" on public.profiles;
create policy "wr_profiles" on public.profiles
  for all to authenticated using (public.eh_master()) with check (public.eh_master());

-- ---------------------------------------------------------------------
-- veiculos: visibilidade = regra de lib/visibilidade.ts. Escrita só Master.
-- ---------------------------------------------------------------------
drop policy if exists "sel_veiculos" on public.veiculos;
create policy "sel_veiculos" on public.veiculos
  for select to authenticated using (
    public.eh_master()
    or (
      secretaria_id = public.minha_secretaria()
      and (
        public.meu_perfil() = 'gestor'
        or superintendencia_id is null
        or superintendencia_id = public.minha_superintendencia()
      )
    )
  );
drop policy if exists "wr_veiculos" on public.veiculos;
create policy "wr_veiculos" on public.veiculos
  for all to authenticated using (public.eh_master()) with check (public.eh_master());

-- ---------------------------------------------------------------------
-- agendamentos
-- ---------------------------------------------------------------------
drop policy if exists "sel_agendamentos" on public.agendamentos;
create policy "sel_agendamentos" on public.agendamentos
  for select to authenticated using (
    public.eh_master()
    or solicitante_id = public.meu_profile_id()
    or motorista_id = public.meu_profile_id()
    or veiculo_id in (select id from public.veiculos)
  );
drop policy if exists "ins_agendamentos" on public.agendamentos;
create policy "ins_agendamentos" on public.agendamentos
  for insert to authenticated with check (
    (public.eh_master() or solicitante_id = public.meu_profile_id())
    and veiculo_id in (select id from public.veiculos)
  );
drop policy if exists "upd_agendamentos" on public.agendamentos;
create policy "upd_agendamentos" on public.agendamentos
  for update to authenticated
  using (public.eh_master() or solicitante_id = public.meu_profile_id())
  with check (public.eh_master() or solicitante_id = public.meu_profile_id());
drop policy if exists "del_agendamentos" on public.agendamentos;
create policy "del_agendamentos" on public.agendamentos
  for delete to authenticated
  using (public.eh_master() or solicitante_id = public.meu_profile_id());

-- ---------------------------------------------------------------------
-- Trigger: sincroniza veiculos.status com agendamentos em_andamento.
-- Roda como dono da função (security definer) → não esbarra na RLS de veiculos.
-- Preserva os status manuais 'manutencao' e 'indisponivel'.
-- ---------------------------------------------------------------------
create or replace function public.sincronizar_status_veiculo(p_veiculo_id text)
returns void language plpgsql security definer set search_path = public as $$
declare em_andamento boolean;
begin
  select exists(
    select 1 from public.agendamentos
    where veiculo_id = p_veiculo_id and status = 'em_andamento'
  ) into em_andamento;

  update public.veiculos v
     set status = case when em_andamento then 'em_uso' else 'disponivel' end
   where v.id = p_veiculo_id
     and v.status not in ('manutencao','indisponivel')
     and v.status <> case when em_andamento then 'em_uso' else 'disponivel' end;
end $$;

create or replace function public.trg_agendamentos_status()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.sincronizar_status_veiculo(old.veiculo_id);
    return old;
  end if;
  perform public.sincronizar_status_veiculo(new.veiculo_id);
  if tg_op = 'UPDATE' and new.veiculo_id <> old.veiculo_id then
    perform public.sincronizar_status_veiculo(old.veiculo_id);
  end if;
  return new;
end $$;

drop trigger if exists agendamentos_status on public.agendamentos;
create trigger agendamentos_status
  after insert or update or delete on public.agendamentos
  for each row execute function public.trg_agendamentos_status();
