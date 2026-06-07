-- =====================================================================
-- FROTA PML — migration 0006: ajustes da RLS (Opção A)
-- =====================================================================
-- Complementa a 0003. Resolve as quebras mapeadas no "ensaio" de RLS:
--   1) Gestor da secretaria do veículo pode criar/editar/excluir reservas
--      daquela secretaria (ex.: aprovar pendente, criar em nome de outro).
--   2) Motorista designado pode editar a reserva (check-in/out).
--   3) O KM do veículo passa a ser atualizado por TRIGGER no check-out
--      (antes era escrito pelo cliente, o que a RLS de `veiculos` — só Master —
--      bloquearia).
--
-- Tudo aqui é ADITIVO e idempotente. Pré-requisito: 0003 aplicada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: sou gestor E o veículo é da minha secretaria?
-- ---------------------------------------------------------------------
create or replace function public.gestor_do_veiculo(p_veiculo_id text)
returns boolean
  language sql stable security definer set search_path = public as $$
  select public.meu_perfil() = 'gestor'
     and exists (
       select 1 from public.veiculos v
       where v.id = p_veiculo_id
         and v.secretaria_id = public.minha_secretaria()
     );
$$;

-- ---------------------------------------------------------------------
-- agendamentos: ampliação de escrita (aditiva)
-- ---------------------------------------------------------------------
drop policy if exists "ins_agendamentos_gestor" on public.agendamentos;
create policy "ins_agendamentos_gestor" on public.agendamentos
  for insert to authenticated
  with check (public.gestor_do_veiculo(veiculo_id));

drop policy if exists "upd_agendamentos_gestor" on public.agendamentos;
create policy "upd_agendamentos_gestor" on public.agendamentos
  for update to authenticated
  using (public.gestor_do_veiculo(veiculo_id))
  with check (public.gestor_do_veiculo(veiculo_id));

drop policy if exists "upd_agendamentos_motorista" on public.agendamentos;
create policy "upd_agendamentos_motorista" on public.agendamentos
  for update to authenticated
  using (motorista_id = public.meu_profile_id())
  with check (motorista_id = public.meu_profile_id());

drop policy if exists "del_agendamentos_gestor" on public.agendamentos;
create policy "del_agendamentos_gestor" on public.agendamentos
  for delete to authenticated
  using (public.gestor_do_veiculo(veiculo_id));

-- ---------------------------------------------------------------------
-- Trigger: KM do veículo acompanha o check-out (só sobe).
-- ---------------------------------------------------------------------
create or replace function public.sincronizar_km_veiculo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.km_retorno is not null then
    update public.veiculos
       set km_atual = new.km_retorno
     where id = new.veiculo_id
       and new.km_retorno > km_atual;
  end if;
  return new;
end $$;

drop trigger if exists agendamentos_km on public.agendamentos;
create trigger agendamentos_km
  after insert or update of km_retorno on public.agendamentos
  for each row execute function public.sincronizar_km_veiculo();
