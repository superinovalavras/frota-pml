-- =====================================================================
-- FROTA PML — migration 0016: perfil PORTARIA (observador, só leitura)
-- =====================================================================
-- Fase 1 da portaria (ver docs/PORTARIA-FLUXO.md): cria o nível de acesso
-- "portaria" e a função "Portaria". O porteiro é SOMENTE LEITURA, mas com
-- visão GLOBAL (vê a prefeitura inteira — exceção à visibilidade por
-- secretaria). Não ganha nenhum INSERT/UPDATE/DELETE: a ausência de
-- políticas de escrita para ele já o mantém read-only.
--
-- Aditivo e idempotente: estende os CHECK de nivel_acesso/perfil, recria as
-- políticas de SELECT e insere a função. Não muda nada do fluxo de reserva.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Estender os CHECK para aceitar 'portaria' (drop robusto por coluna)
-- ---------------------------------------------------------------------
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.funcoes'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%nivel_acesso%'
  loop execute format('alter table public.funcoes drop constraint %I', c); end loop;
end $$;
alter table public.funcoes
  add constraint funcoes_nivel_acesso_check
  check (nivel_acesso in ('master','gestor','servidor','portaria'));

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%perfil%'
  loop execute format('alter table public.profiles drop constraint %I', c); end loop;
end $$;
alter table public.profiles
  add constraint profiles_perfil_check
  check (perfil in ('master','gestor','servidor','motorista','portaria'));

-- ---------------------------------------------------------------------
-- 2. Helper: o usuário autenticado é da portaria?
-- ---------------------------------------------------------------------
create or replace function public.eh_portaria() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(
    (select perfil = 'portaria' from public.profiles where auth_user_id = auth.uid() limit 1),
    false) $$;

-- ---------------------------------------------------------------------
-- 3. Leitura GLOBAL para a portaria (adiciona `or public.eh_portaria()`)
--    Dados de referência (secretarias, superintendencias, funcoes) já são
--    SELECT para qualquer autenticado — nada a mudar lá.
-- ---------------------------------------------------------------------
drop policy if exists "sel_profiles" on public.profiles;
create policy "sel_profiles" on public.profiles
  for select to authenticated using (
    public.eh_master()
    or public.eh_portaria()
    or auth_user_id = auth.uid()
    or secretaria_id = public.minha_secretaria()
  );

drop policy if exists "sel_veiculos" on public.veiculos;
create policy "sel_veiculos" on public.veiculos
  for select to authenticated using (
    public.eh_master()
    or public.eh_portaria()
    or (
      secretaria_id = public.minha_secretaria()
      and (
        public.meu_perfil() = 'gestor'
        or superintendencia_id is null
        or superintendencia_id = public.minha_superintendencia()
      )
    )
  );

drop policy if exists "sel_agendamentos" on public.agendamentos;
create policy "sel_agendamentos" on public.agendamentos
  for select to authenticated using (
    public.eh_master()
    or public.eh_portaria()
    or solicitante_id = public.meu_profile_id()
    or motorista_id = public.meu_profile_id()
    or veiculo_id in (select id from public.veiculos)
  );

-- ---------------------------------------------------------------------
-- 4. Função "Portaria" (sistema, não excluível). Hierarquia baixa (não
--    disputa reserva). Quem receber esta função terá perfil = 'portaria'.
-- ---------------------------------------------------------------------
insert into public.funcoes (id, nome, hierarquia, nivel_acesso, sistema, eh_motorista, eh_master)
values ('f-portaria', 'Portaria', 100, 'portaria', true, false, false)
on conflict (id) do nothing;
