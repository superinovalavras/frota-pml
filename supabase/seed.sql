-- =====================================================================
-- FROTA PML — Seed inicial
-- =====================================================================
-- Espelha lib/mock/* (secretarias, superintendências, funções, usuários,
-- veículos). Idempotente: pode rodar mais de uma vez.
--
-- Aplicar:
--   * via Supabase CLI:   supabase db reset   (roda migrations + este seed)
--   * ou colar no SQL Editor do painel depois das migrations.
--
-- NÃO inclui agendamentos — o sistema começa sem reservas.
-- =====================================================================

-- ÓRGÃOS -------------------------------------------------------------
insert into public.secretarias (id, nome, sigla) values
  ('sec-desenvolvimento', 'Secretaria de Desenvolvimento',              'SDES'),
  ('sec-administracao',   'Secretaria de Administração',                'SEMAD'),
  ('sec-fazenda',         'Secretaria de Fazenda',                      'SEFAZ'),
  ('sec-educacao',        'Secretaria de Educação',                     'SEDUC'),
  ('sec-saude',           'Secretaria de Saúde',                        'SMS'),
  ('sec-obras',           'Secretaria de Obras e Serviços Públicos',    'SEMOSP'),
  ('sec-meio-ambiente',   'Secretaria de Meio Ambiente',                'SEMMA'),
  ('sec-cultura',         'Secretaria de Cultura, Turismo e Esportes',  'SECTE'),
  ('sec-gabinete',        'Gabinete do Prefeito',                       'GABINETE')
on conflict (id) do nothing;

-- SUPERINTENDÊNCIAS --------------------------------------------------
insert into public.superintendencias (id, nome, sigla, secretaria_id) values
  ('sup-inovacao',         'Superintendência de Inovação',              'INOV', 'sec-desenvolvimento'),
  ('sup-regulacao-urbana', 'Regulação Urbana',                          'REG',  'sec-desenvolvimento'),
  ('sup-sala-mineira',     'Sala Mineira',                              'SM',   'sec-desenvolvimento'),
  ('sup-fiscalizacao',     'Fiscalização de Indústria e Comércio',      'FIC',  'sec-desenvolvimento')
on conflict (id) do nothing;

-- FUNÇÕES ------------------------------------------------------------
insert into public.funcoes (id, nome, hierarquia, nivel_acesso, sistema, eh_motorista, eh_master) values
  ('f-master',          'Master',           1,  'master',   true,  false, true),
  ('f-fiscal',          'Fiscal',           2,  'servidor', false, false, false),
  ('f-secretario',      'Secretário(a)',    3,  'gestor',   false, false, false),
  ('f-superintendente', 'Superintendente',  4,  'gestor',   false, false, false),
  ('f-subsecretario',   'Subsecretário(a)', 5,  'gestor',   false, false, false),
  ('f-servidor',        'Servidor(a)',      10, 'servidor', false, false, false),
  ('f-motorista',       'Motorista',        99, 'servidor', true,  true,  false)
on conflict (id) do nothing;

-- USUÁRIOS / PERFIS --------------------------------------------------
-- auth_user_id fica null até a pessoa fazer o primeiro login (Fase 2b).
insert into public.profiles
  (id, nome, cpf, masp, email, cargo, funcao_id, perfil, hierarquia,
   secretaria_id, superintendencia_id, telefone,
   cnh_categoria, cnh_numero, cnh_validade, foto_url)
values
  ('u-ramon-master', 'Ramon Fontana', '', '', 'ramonsouza0212@gmail.com',
   'Administrador do Sistema', 'f-master', 'master', 1,
   'sec-desenvolvimento', null, '',
   null, null, null, null),

  ('u-rodolfo', 'Rodolfo Alvarenga', '', '', 'rodolfo.alvarenga@lavras.mg.gov.br',
   'Secretário de Desenvolvimento', 'f-secretario', 'gestor', 3,
   'sec-desenvolvimento', null, '',
   'B', '04823916705', '2029-08-20', '/servidores/rodolfo.jpg'),

  ('u-bruno', 'Bruno dos Anjos Oliveira', '', '', 'bruno.oliveira@lavras.mg.gov.br',
   'Subsecretário de Urbanismo', 'f-subsecretario', 'gestor', 5,
   'sec-desenvolvimento', null, '',
   'B', '06195320487', '2027-11-30', '/servidores/bruno.jpg'),

  ('u-rennan', 'Rennan Campos', '', '', 'rennan.campos@lavras.mg.gov.br',
   'Superintendente de Inovação', 'f-superintendente', 'gestor', 4,
   'sec-desenvolvimento', 'sup-inovacao', '',
   null, null, null, '/servidores/rennan.jpg'),

  ('u-raquel', 'Raquel Silva Pedrosa', '', '', 'raquel.pedrosa@lavras.mg.gov.br',
   'Agente de Inovação', 'f-servidor', 'servidor', 10,
   'sec-desenvolvimento', 'sup-inovacao', '',
   'B', '07301548692', '2030-03-15', '/servidores/raquel.jpg'),

  ('u-motorista-jose', 'José Antônio Lima', '', '', 'jose.lima@lavras.mg.gov.br',
   'Motorista oficial', 'f-motorista', 'servidor', 99,
   'sec-desenvolvimento', null, '',
   'D', '07654321098', '2028-04-15', null)
on conflict (id) do nothing;

-- VEÍCULOS -----------------------------------------------------------
insert into public.veiculos
  (id, placa, modelo, marca, ano, cor, cnh_exigida,
   secretaria_id, superintendencia_id, status, km_atual, observacoes, foto_url)
values
  ('v-mobi', 'PYT-6155', 'Mobi', 'Fiat', 2020, 'Branco', 'B',
   'sec-desenvolvimento', 'sup-inovacao', 'disponivel', 38420, null, '/veiculos/mobi.jpg'),

  ('v-polo', 'TED-2H18', 'Polo', 'Volkswagen', 2022, 'Branco', 'B',
   'sec-desenvolvimento', null, 'disponivel', 19875, null, '/veiculos/polo.jpg'),

  ('v-strada', 'QUV-1A47', 'Strada', 'Fiat', 2021, 'Prata', 'B',
   'sec-desenvolvimento', null, 'manutencao', 62103,
   'Troca de embreagem agendada para esta semana.', null),

  ('v-sprinter', 'RNB-3D29', 'Sprinter 415', 'Mercedes-Benz', 2019, 'Branco', 'D',
   'sec-desenvolvimento', null, 'disponivel', 95480,
   'Van de 16 lugares — uso preferencial para deslocamentos em grupo.', null)
on conflict (id) do nothing;
