-- B27 · Catálogo de cenários e risco corporativo (transversal).
--
-- - cenarios_risco: biblioteca de cenários (causa, evento e consequência
--   padrão), na linha da ISO 27005. codigo = CEN-001, CEN-002...
-- - riscos.cenario_id: o risco de cada projeto pode ser ligado a um cenário;
--   continua com avaliação, dono e tratamento próprios.
-- - cenarios_risco.risco_corporativo_id: risco corporativo (dono e
--   tratamento central), registrado como risco do projeto
--   "Corporativo (transversal)", criado pelo sistema no primeiro uso.
-- - Carga inicial: os cenários que já aparecem em 2 ou mais projetos viram
--   entradas do catálogo, e os riscos com o mesmo evento, causa e
--   consequência são ligados a elas.

BEGIN;

CREATE TABLE IF NOT EXISTS cenarios_risco (
  id serial PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  evento text NOT NULL,
  causa text NOT NULL,
  consequencia text NOT NULL,
  categoria text,
  descricao text,
  risco_corporativo_id integer REFERENCES riscos(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por_email text
);

DROP TRIGGER IF EXISTS trg_log_alteracoes ON cenarios_risco;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON cenarios_risco
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();

ALTER TABLE riscos ADD COLUMN IF NOT EXISTS cenario_id integer REFERENCES cenarios_risco(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_riscos_cenario ON riscos (cenario_id);

INSERT INTO cenarios_risco (codigo, nome, evento, causa, consequencia, categoria, criado_por_email)
SELECT 'CEN-' || lpad(row_number() OVER (ORDER BY projetos DESC, evento)::text, 3, '0'),
       evento, evento, causa, consequencia, categoria, 'migracao-b27'
FROM (
  SELECT evento, causa, consequencia, min(categoria) AS categoria, count(DISTINCT projeto_id) AS projetos
  FROM riscos
  WHERE evento IS NOT NULL AND causa IS NOT NULL AND consequencia IS NOT NULL
  GROUP BY evento, causa, consequencia
  HAVING count(DISTINCT projeto_id) >= 2
) x
WHERE NOT EXISTS (SELECT 1 FROM cenarios_risco);

UPDATE riscos r SET cenario_id = c.id
FROM cenarios_risco c
WHERE r.cenario_id IS NULL AND r.evento = c.evento AND r.causa = c.causa AND r.consequencia = c.consequencia;

COMMIT;
