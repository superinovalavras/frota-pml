-- =====================================================================
-- FROTA PML — migration 0011: manutenção sem previsão de retorno
-- =====================================================================
-- Permite registrar uma manutenção SEM data de retorno (indeterminada).
-- A coluna passa a aceitar NULL (= "sem previsão"). O app trata null como
-- "veículo fora por tempo indefinido" e cancela todas as reservas ativas.
-- Idempotente.
-- =====================================================================

alter table public.manutencoes
  alter column previsao_retorno drop not null;
