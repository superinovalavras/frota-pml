-- =====================================================================
-- FROTA PML — migration 0010: privacidade (LGPD) e notificações
-- =====================================================================
-- 1) CPF e MASP deixam de ficar visíveis para colegas comuns. A view
--    `usuarios_visiveis` mascara esses dois campos para quem NÃO é dono do
--    registro, master, ou gestor da mesma secretaria. Os demais campos
--    (nome, e-mail, telefone, função, órgão, foto, CNH) seguem visíveis,
--    conforme a política de dados acordada.
--
--    A view usa `security_invoker = true` → respeita a RLS de `profiles`
--    (mesma regra de quais LINHAS cada um enxerga); o CASE só mascara as
--    COLUNAS sensíveis. O app passa a LER usuários por esta view; a escrita
--    continua direto em `profiles` (RLS / rotas admin).
--    Requer PostgreSQL 15+ (Supabase já é).
--
-- 2) Notificações: o INSERT deixa de ser "qualquer um para qualquer um".
--    Só é possível criar notificação para um perfil que o autor consegue
--    enxergar (mesma secretaria, ou master) — fecha o vetor de mensagens
--    arbitrárias para pessoas fora do alcance do usuário.
--
-- Idempotente. Pré-requisito: 0003/0006/0007 aplicadas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) View com CPF/MASP mascarados
-- ---------------------------------------------------------------------
create or replace view public.usuarios_visiveis
with (security_invoker = true) as
select
  p.id,
  p.auth_user_id,
  p.nome,
  p.email,
  p.cargo,
  p.funcao_id,
  p.perfil,
  p.hierarquia,
  p.secretaria_id,
  p.superintendencia_id,
  p.telefone,
  p.cnh_categoria,
  p.cnh_numero,
  p.cnh_validade,
  p.foto_url,
  p.criado_em,
  case
    when public.eh_master()
      or p.auth_user_id = auth.uid()
      or (public.meu_perfil() = 'gestor'
          and p.secretaria_id = public.minha_secretaria())
    then p.cpf else ''
  end as cpf,
  case
    when public.eh_master()
      or p.auth_user_id = auth.uid()
      or (public.meu_perfil() = 'gestor'
          and p.secretaria_id = public.minha_secretaria())
    then p.masp else ''
  end as masp
from public.profiles p;

grant select on public.usuarios_visiveis to authenticated;

-- ---------------------------------------------------------------------
-- 2) Notificações: restringe o destinatário aos perfis visíveis ao autor
-- ---------------------------------------------------------------------
drop policy if exists "ins_notificacoes" on public.notificacoes;
create policy "ins_notificacoes" on public.notificacoes
  for insert to authenticated
  with check (destinatario_id in (select id from public.profiles));
