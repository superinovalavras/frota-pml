-- 0013_veiculo_secretarias_visiveis.sql
-- Compartilhamento de veículo entre secretarias.
--
-- Além da secretaria DONA (secretaria_id), um veículo pode ser visível/reservável
-- por outras secretarias, listadas em `secretarias_visiveis` (ids). A secretaria
-- dona sempre enxerga; as compartilhadas enxergam por inteiro (sem sub-filtro de
-- superintendência). Só o Master edita (política wr_veiculos inalterada).
--
-- Aditiva e segura: coluna com default '{}' (nenhum veículo compartilhado até o
-- Master configurar). Espelha a regra da lib/visibilidade.ts na RLS.

alter table public.veiculos
  add column if not exists secretarias_visiveis text[] not null default '{}';

-- SELECT: dona (regra atual) OU minha secretaria está na lista de compartilhadas.
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
    or (public.minha_secretaria() = any(secretarias_visiveis))
  );
