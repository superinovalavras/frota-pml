-- =====================================================================
-- FROTA PML — migration 0008: nº de lugares do veículo
-- =====================================================================
-- Usado para impedir reservas com mais ocupantes (motorista + passageiros)
-- do que o carro comporta. Default 5 (carro comum); o Master ajusta por
-- veículo. Idempotente.
-- =====================================================================

alter table public.veiculos
  add column if not exists lugares int not null default 5;
