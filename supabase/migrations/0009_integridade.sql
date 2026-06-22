-- =====================================================================
-- FROTA PML — migration 0009: integridade de agendamentos
-- =====================================================================
-- Fecha lacunas que a RLS sozinha não cobria:
--   1) SOBREPOSIÇÃO de reservas (double-booking): a checagem de conflito
--      vivia só no cliente. Agora o BANCO recusa duas reservas ATIVAS do
--      mesmo veículo com janelas que se cruzam (constraint de exclusão).
--   2) STATUS: um servidor podia, chamando o banco direto, mudar a PRÓPRIA
--      reserva de "pendente" para "confirmado" (burlando o gestor). Um
--      trigger passa a exigir privilégio para avançar o status.
--   3) UNICIDADE de CPF / MASP / e-mail em profiles (o login resolve
--      CPF/MASP → e-mail; duplicata causava ambiguidade e contas repetidas).
--
-- Idempotente. Pré-requisito: 0003 e 0006 aplicadas (usa eh_master(),
-- gestor_do_veiculo(), meu_profile_id(), meu_perfil()).
--
-- ⚠️ ANTES DE APLICAR — rode estas conferências; se trouxerem linhas,
--    limpe os dados primeiro, senão a criação das constraints FALHA:
--
--   -- (1) reservas ativas já sobrepostas no mesmo veículo:
--   select a.id, b.id, a.veiculo_id
--     from public.agendamentos a
--     join public.agendamentos b
--       on a.veiculo_id = b.veiculo_id and a.id < b.id
--      and tstzrange(a.inicio, a.fim, '[)') && tstzrange(b.inicio, b.fim, '[)')
--    where a.status in ('pendente','confirmado','em_andamento')
--      and b.status in ('pendente','confirmado','em_andamento');
--
--   -- (3) CPF/MASP/e-mail duplicados:
--   select cpf, count(*) from public.profiles where cpf <> '' group by cpf having count(*) > 1;
--   select masp, count(*) from public.profiles where masp <> '' group by masp having count(*) > 1;
--   select lower(email), count(*) from public.profiles where email <> '' group by lower(email) having count(*) > 1;
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Anti-sobreposição (double-booking)
-- ---------------------------------------------------------------------
create extension if not exists btree_gist;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'agendamentos_sem_sobreposicao'
       and conrelid = 'public.agendamentos'::regclass
  ) then
    alter table public.agendamentos
      add constraint agendamentos_sem_sobreposicao
      exclude using gist (
        veiculo_id with =,
        tstzrange(inicio, fim, '[)') with &&
      ) where (status in ('pendente','confirmado','em_andamento'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2) Guarda de status. Regras (alinhadas com a UI em agendamento-detalhe.tsx
--    e com proximosStatus() em lib/agendamento-utils.ts):
--      • APROVAR (→ confirmado) é privilégio de gestor do veículo (ou master).
--        Fecha a brecha de um servidor auto-confirmar a própria reserva.
--      • A ORDEM do fluxo é respeitada: só se inicia (→ em_andamento) uma
--        reserva confirmada, e só se conclui (→ concluido) uma em andamento.
--        Isso vale para todos (menos master) e impede pular a aprovação.
--      • QUEM pode mexer já é limitado pela RLS (solicitante, motorista
--        designado, gestor do veículo, master). Por isso o solicitante/
--        motorista continuam podendo INICIAR e CONCLUIR a própria viagem.
--    Master corrige qualquer coisa; contexto server (auth.uid() nulo, das
--    rotas /api) passa direto, pois essas rotas autorizam por conta própria.
-- ---------------------------------------------------------------------
create or replace function public.guard_agendamento_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then return new; end if;
  if auth.uid() is null then return new; end if; -- contexto server (/api)
  if public.eh_master() then return new; end if; -- master corrige tudo

  if new.status = 'confirmado'
     and not public.gestor_do_veiculo(new.veiculo_id) then
    raise exception 'Apenas gestor ou master pode confirmar a reserva.'
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

drop trigger if exists agendamentos_guard_status on public.agendamentos;
create trigger agendamentos_guard_status
  before update of status on public.agendamentos
  for each row execute function public.guard_agendamento_status();

-- ---------------------------------------------------------------------
-- 3) Unicidade de CPF / MASP / e-mail (ignora vazios; e-mail sem caixa)
-- ---------------------------------------------------------------------
create unique index if not exists uq_profiles_cpf
  on public.profiles (cpf) where cpf <> '';
create unique index if not exists uq_profiles_masp
  on public.profiles (masp) where masp <> '';
create unique index if not exists uq_profiles_email
  on public.profiles (lower(email)) where email <> '';
