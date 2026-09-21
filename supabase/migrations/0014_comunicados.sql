-- 0014_comunicados.sql
-- Comunicados gerais: avisos que abrem num modal ao entrar no site.
-- Master cria/edita; direciona para todos ou secretarias; tem validade (dias),
-- agendamento de início, nível (info/importante/urgente) e opção de exigir
-- ciência ("Li e estou ciente"). Cada pessoa pode dispensar ("não mostrar
-- novamente") — registrado no servidor, então vale em qualquer aparelho.
-- Aditiva; não toca em nada existente.

create table if not exists public.comunicados (
  id            text primary key default public.novo_id(),
  titulo        text not null,
  mensagem      text not null,               -- markdown leve: **negrito** + quebras de linha
  nivel         text not null default 'informativo'
                  check (nivel in ('informativo','importante','urgente')),
  publico_alvo  text not null default 'todos'
                  check (publico_alvo in ('todos','secretarias')),
  secretarias   text[] not null default '{}',   -- usado quando publico_alvo='secretarias'
  exige_ciencia boolean not null default false,  -- exige "Li e estou ciente"
  inicio_em     timestamptz not null default now(),  -- começa a aparecer a partir daqui
  fim_em        timestamptz not null,               -- some depois disto (início + N dias)
  ativo         boolean not null default true,
  criado_por    text references public.profiles(id) on delete set null,
  criado_em     timestamptz not null default now()
);
create index if not exists idx_comunicados_janela
  on public.comunicados (ativo, inicio_em, fim_em);

-- Dispensa / ciência por pessoa.
create table if not exists public.comunicados_vistos (
  comunicado_id text not null references public.comunicados(id) on delete cascade,
  profile_id    text not null references public.profiles(id) on delete cascade,
  dispensado    boolean not null default false,   -- "não mostrar novamente"
  ciente_em     timestamptz,                       -- quando clicou "Li e estou ciente"
  visto_em      timestamptz not null default now(),
  primary key (comunicado_id, profile_id)
);

alter table public.comunicados        enable row level security;
alter table public.comunicados_vistos enable row level security;

-- comunicados: master gerencia; os demais leem apenas os direcionados a eles.
drop policy if exists "sel_comunicados" on public.comunicados;
create policy "sel_comunicados" on public.comunicados
  for select to authenticated using (
    public.eh_master()
    or publico_alvo = 'todos'
    or public.minha_secretaria() = any(secretarias)
  );
drop policy if exists "wr_comunicados" on public.comunicados;
create policy "wr_comunicados" on public.comunicados
  for all to authenticated using (public.eh_master()) with check (public.eh_master());

-- comunicados_vistos: cada um gerencia o SEU; master vê tudo (quem confirmou).
drop policy if exists "sel_comunicados_vistos" on public.comunicados_vistos;
create policy "sel_comunicados_vistos" on public.comunicados_vistos
  for select to authenticated using (
    public.eh_master() or profile_id = public.meu_profile_id()
  );
drop policy if exists "ins_comunicados_vistos" on public.comunicados_vistos;
create policy "ins_comunicados_vistos" on public.comunicados_vistos
  for insert to authenticated with check (profile_id = public.meu_profile_id());
drop policy if exists "upd_comunicados_vistos" on public.comunicados_vistos;
create policy "upd_comunicados_vistos" on public.comunicados_vistos
  for update to authenticated
  using (profile_id = public.meu_profile_id())
  with check (profile_id = public.meu_profile_id());
