-- Migração aditiva: suporte a faixa (mín/provável/máx) e distribuição de
-- impacto financeiro (p10/p90), pra sair do cálculo pontual e ir pra uma
-- estimativa com incerteza (via simulação Monte Carlo / PERT).
--
-- Não remove nem renomeia nenhuma coluna existente:
-- - duracao_horas, percentual_degradacao, restauracao_pessoas, restauracao_horas
--   continuam existindo e passam a guardar o valor "mais provável" (moda).
-- - impacto_critico_total / impacto_alto_total continuam existindo e
--   guardando um valor único (agora a mediana da simulação em vez do
--   cálculo pontual) — dashboard e relatório (SUM sobre essas colunas)
--   continuam funcionando sem qualquer alteração.
--
-- Rode isso no SQL Editor do Neon (ou via `psql "$DATABASE_URL" -f
-- db/migrations/0001_impacto_financeiro_faixas.sql`). Idempotente — pode
-- rodar mais de uma vez sem erro.

ALTER TABLE riscos
  ADD COLUMN IF NOT EXISTS duracao_horas_min numeric,
  ADD COLUMN IF NOT EXISTS duracao_horas_max numeric,
  ADD COLUMN IF NOT EXISTS percentual_degradacao_min numeric,
  ADD COLUMN IF NOT EXISTS percentual_degradacao_max numeric,
  ADD COLUMN IF NOT EXISTS restauracao_pessoas_min numeric,
  ADD COLUMN IF NOT EXISTS restauracao_pessoas_max numeric,
  ADD COLUMN IF NOT EXISTS restauracao_horas_min numeric,
  ADD COLUMN IF NOT EXISTS restauracao_horas_max numeric,
  ADD COLUMN IF NOT EXISTS impacto_critico_p10 numeric,
  ADD COLUMN IF NOT EXISTS impacto_critico_p90 numeric,
  ADD COLUMN IF NOT EXISTS impacto_alto_p10 numeric,
  ADD COLUMN IF NOT EXISTS impacto_alto_p90 numeric;

-- Riscos cadastrados antes desta migração ficam com as colunas novas em
-- NULL (era um valor pontual, sem faixa — não dá pra reconstruir incerteza
-- que nunca foi capturada). O frontend deve tratar p10/p90 nulos mostrando
-- só o valor único, como fazia antes.
