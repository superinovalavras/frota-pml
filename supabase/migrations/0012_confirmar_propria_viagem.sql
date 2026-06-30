-- =====================================================================
-- FROTA PML — migration 0012: solicitante/motorista podem confirmar
-- =====================================================================
-- Ajusta o trigger guard_agendamento_status (0009): além de master e gestor
-- do veículo, agora o PRÓPRIO solicitante e o MOTORISTA designado também
-- podem confirmar a própria viagem (pendente → confirmado).
-- O resto (ordem do fluxo em_andamento/concluido) continua igual.
-- Idempotente (create or replace).
-- =====================================================================

create or replace function public.guard_agendamento_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then return new; end if;
  if auth.uid() is null then return new; end if; -- contexto server (/api)
  if public.eh_master() then return new; end if; -- master corrige tudo

  -- Confirmar: gestor do veículo, OU o próprio solicitante, OU o motorista.
  if new.status = 'confirmado'
     and not public.gestor_do_veiculo(new.veiculo_id)
     and new.solicitante_id is distinct from public.meu_profile_id()
     and new.motorista_id is distinct from public.meu_profile_id() then
    raise exception 'Sem permissão para confirmar esta reserva.'
      using errcode = '42501';
  end if;

  if new.status = 'em_andamento'
     and old.status not in ('confirmado','em_andamento') then
    raise exception 'Só é possível iniciar uma reserva confirmada.'
      using errcode = '42501';
  end if;

  if new.status = 'concluido'
     and old.status not in ('em_andamento','concluido') then
    raise exception 'Só é possível concluir uma viagem em andamento.'
      using errcode = '42501';
  end if;

  return new;
end $$;
