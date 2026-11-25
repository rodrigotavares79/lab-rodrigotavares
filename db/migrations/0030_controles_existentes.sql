-- B15 · Controles existentes no cálculo do nível atual.
--
-- - riscos.sem_controles (+ justificativa, quem, quando): declaração de que o
--   risco não tem controle existente. O cadastro exige ao menos um controle
--   (fator de risco com controle) ou esta declaração. Cadastrar um controle
--   depois desfaz a declaração.
-- - planos_acao.fator_id: controle que o plano de ação implementa. Quando o
--   plano é auditado como Conforme, o controle passa a "Implementado e
--   validado" e o nível atual do risco é recalculado.
-- Os riscos existentes ficam como "controles não avaliados" até alguém
-- cadastrar os controles ou declarar que não há.

BEGIN;

ALTER TABLE riscos ADD COLUMN IF NOT EXISTS sem_controles boolean NOT NULL DEFAULT false;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS sem_controles_justificativa text;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS sem_controles_por_email text;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS sem_controles_em timestamptz;

ALTER TABLE planos_acao ADD COLUMN IF NOT EXISTS fator_id integer REFERENCES fatores_risco(id) ON DELETE SET NULL;

COMMIT;
