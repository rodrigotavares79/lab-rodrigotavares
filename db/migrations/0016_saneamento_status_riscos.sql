-- B01 · Saneamento do status dos riscos.
--
-- Corrige os registros que violam as regras de transição (lib/statusRisco.ts):
--   1. Mitigado sem plano, ou com algum plano que não está Conforme
--      → volta para Em Tratamento (tem plano) ou Identificado (não tem).
--      Casos conhecidos: riscos mitigados antes da auditoria existir (0014),
--      como o #54, cujo plano está Aguardando auditoria.
--   2. Em Tratamento sem nenhum plano → Identificado (ex.: #58).
--   3. Identificado com plano → Em Tratamento.
--   4. Status vazio (NULL) → Identificado ou Em Tratamento, conforme os planos.
--      Hoje a tela mostra NULL como "Identificado", mas o Dashboard não o
--      conta como "em aberto".
--
-- ANTES DE RODAR, veja o que vai mudar:
--
--   SELECT r.id, r.status AS status_atual, x.novo_status, x.total, x.conformes
--   FROM riscos r
--   JOIN LATERAL (
--     SELECT COUNT(pa.id)::int AS total,
--            COUNT(pa.id) FILTER (WHERE pa.auditoria_status = 'Conforme')::int AS conformes,
--            CASE
--              WHEN r.status = 'Mitigado' AND COUNT(pa.id) > 0
--                   AND COUNT(pa.id) FILTER (WHERE pa.auditoria_status = 'Conforme') = COUNT(pa.id)
--                THEN 'Mitigado'
--              WHEN COUNT(pa.id) > 0 THEN 'Em Tratamento'
--              ELSE 'Identificado'
--            END AS novo_status
--     FROM planos_acao pa WHERE pa.risco_id = r.id
--   ) x ON true
--   WHERE r.status IS DISTINCT FROM x.novo_status
--   ORDER BY r.id;
--
-- Rodar: psql "$DATABASE_URL" -f db/migrations/0016_saneamento_status_riscos.sql
-- Faça um backup antes (scripts/backup-db.sh).

BEGIN;

WITH resumo AS (
  SELECT r.id,
         r.status,
         COUNT(pa.id)::int AS total,
         COUNT(pa.id) FILTER (WHERE pa.auditoria_status = 'Conforme')::int AS conformes
  FROM riscos r
  LEFT JOIN planos_acao pa ON pa.risco_id = r.id
  GROUP BY r.id, r.status
),
alvo AS (
  SELECT id,
         CASE
           WHEN status = 'Mitigado' AND total > 0 AND conformes = total THEN 'Mitigado'
           WHEN total > 0 THEN 'Em Tratamento'
           ELSE 'Identificado'
         END AS novo_status
  FROM resumo
)
UPDATE riscos r
SET status = alvo.novo_status,
    mitigado_em = CASE WHEN alvo.novo_status = 'Mitigado' THEN r.mitigado_em ELSE NULL END
FROM alvo
WHERE alvo.id = r.id
  AND r.status IS DISTINCT FROM alvo.novo_status;

-- Riscos novos (cadastro individual e importação CSV) nascem Identificado.
ALTER TABLE riscos ALTER COLUMN status SET DEFAULT 'Identificado';
ALTER TABLE riscos ALTER COLUMN status SET NOT NULL;
ALTER TABLE riscos DROP CONSTRAINT IF EXISTS riscos_status_valido;
ALTER TABLE riscos ADD CONSTRAINT riscos_status_valido
  CHECK (status IN ('Identificado', 'Em Tratamento', 'Mitigado'));

COMMIT;
