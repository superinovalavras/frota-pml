-- =====================================================================
-- FROTA PML — migration 0005: triggers de denormalização
-- =====================================================================
-- A tabela `profiles` guarda `perfil` e `hierarquia` denormalizados a
-- partir de `funcoes` (campos `nivel_acesso` e `hierarquia`). Esta
-- migration cria dois triggers para manter os campos em sincronia:
--
--   1) Em INSERT/UPDATE de profiles: sempre que `funcao_id` mudar,
--      preenche `perfil` e `hierarquia` a partir da função referenciada.
--
--   2) Em UPDATE de funcoes (mudança de hierarquia ou nivel_acesso):
--      propaga para todos os profiles que usam aquela função.
--
-- Pré-requisito: migrations 0001..0004 aplicadas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Trigger: profiles → herda valores da função ao salvar.
-- ---------------------------------------------------------------------
create or replace function public.sync_perfil_de_funcao()
returns trigger
language plpgsql
as $$
declare
  f_nivel text;
  f_hier  int;
begin
  if new.funcao_id is null then
    return new;
  end if;

  -- Só roda quando a função mudou (insert ou update de funcao_id).
  if tg_op = 'UPDATE' and new.funcao_id is not distinct from old.funcao_id then
    return new;
  end if;

  select nivel_acesso, hierarquia
    into f_nivel, f_hier
    from public.funcoes
   where id = new.funcao_id;

  if f_nivel is null then
    -- Função não encontrada — deixa o valor que veio (não bloqueia o save).
    return new;
  end if;

  new.perfil := f_nivel;
  new.hierarquia := f_hier;
  return new;
end
$$;

drop trigger if exists trg_profiles_sync_funcao on public.profiles;
create trigger trg_profiles_sync_funcao
  before insert or update of funcao_id on public.profiles
  for each row
  execute function public.sync_perfil_de_funcao();

-- ---------------------------------------------------------------------
-- 2) Trigger: funcoes → propaga para profiles ao atualizar.
-- ---------------------------------------------------------------------
create or replace function public.sync_profiles_de_funcao()
returns trigger
language plpgsql
as $$
begin
  -- Roda só se hierarquia ou nivel_acesso mudaram (evita writes desnecessários).
  if new.hierarquia is not distinct from old.hierarquia
     and new.nivel_acesso is not distinct from old.nivel_acesso then
    return new;
  end if;

  update public.profiles
     set hierarquia = new.hierarquia,
         perfil     = new.nivel_acesso
   where funcao_id = new.id
     and (hierarquia is distinct from new.hierarquia
          or perfil is distinct from new.nivel_acesso);

  return new;
end
$$;

drop trigger if exists trg_funcoes_sync_profiles on public.funcoes;
create trigger trg_funcoes_sync_profiles
  after update of hierarquia, nivel_acesso on public.funcoes
  for each row
  execute function public.sync_profiles_de_funcao();

-- ---------------------------------------------------------------------
-- Reconciliação inicial — caso algum profile tenha caído fora de
-- sincronia antes do trigger existir.
-- ---------------------------------------------------------------------
update public.profiles p
   set hierarquia = f.hierarquia,
       perfil     = f.nivel_acesso
  from public.funcoes f
 where p.funcao_id = f.id
   and (p.hierarquia is distinct from f.hierarquia
        or p.perfil is distinct from f.nivel_acesso);
