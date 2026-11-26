-- B23 · Estimativa quantitativa simples de exposição financeira.
--
-- - Frequência anual e perda por evento em faixas (mín, provável, máx).
-- - perda_origem: 'manual' (informada) ou 'ativo' (custo de indisponibilidade
--   por hora do ativo crítico × horas de parada, guardadas em horas_parada_*).
-- - exposicao_ale / _min / _max: perda anual esperada e sua faixa, gravadas
--   na hora do cálculo (lib/exposicaoRisco) para o ranking do relatório.
-- - As alterações entram no log do risco pelo trigger já existente.

BEGIN;

ALTER TABLE riscos ADD COLUMN IF NOT EXISTS freq_anual_min numeric;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS freq_anual_provavel numeric;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS freq_anual_max numeric;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS perda_evento_min numeric;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS perda_evento_provavel numeric;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS perda_evento_max numeric;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS perda_origem text;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS horas_parada_min numeric;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS horas_parada_provavel numeric;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS horas_parada_max numeric;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS exposicao_ale numeric;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS exposicao_min numeric;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS exposicao_max numeric;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS exposicao_premissas text;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS exposicao_em timestamptz;

ALTER TABLE riscos DROP CONSTRAINT IF EXISTS riscos_perda_origem_valida;
ALTER TABLE riscos ADD CONSTRAINT riscos_perda_origem_valida CHECK (perda_origem IS NULL OR perda_origem IN ('manual', 'ativo'));

CREATE INDEX IF NOT EXISTS idx_riscos_exposicao ON riscos (exposicao_ale DESC NULLS LAST);

COMMIT;
