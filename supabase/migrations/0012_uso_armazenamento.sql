-- 0012_uso_armazenamento.sql
-- Função read-only que informa o consumo de armazenamento (tamanho do banco +
-- soma das fotos no Storage). Usada pelo medidor do Master em Relatórios.
--
-- security definer: roda com privilégios do dono (superuser do projeto) para
-- conseguir ler pg_database_size e storage.objects. Só o service_role pode
-- executá-la (a server action já exige Master antes de chamar).
-- Aditiva e sem tocar em nenhum dado — segura para aplicar a qualquer momento.

create or replace function public.uso_armazenamento()
returns json
language sql
security definer
set search_path = pg_catalog, public
as $$
  select json_build_object(
    'banco_bytes',    pg_database_size(current_database()),
    'fotos_bytes',    coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'fotos_arquivos', (select count(*)::int from storage.objects)
  );
$$;

revoke all on function public.uso_armazenamento() from public;
revoke all on function public.uso_armazenamento() from anon;
revoke all on function public.uso_armazenamento() from authenticated;
grant execute on function public.uso_armazenamento() to service_role;
