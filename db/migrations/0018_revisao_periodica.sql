-- B17 · Revisão periódica dos riscos.
--
-- Cada nível tem um prazo de revisão (parametros_revisao, editável). A
-- próxima revisão = data da última revisão (riscos.revisado_em, no fuso de
-- São Paulo) + prazo do nível ATUAL do risco. Por ser calculada, ela acompanha
-- mudanças de nível sem precisar ser regravada.
--
-- "Salvar reavaliação" na tela do risco registra a revisão (revisado_em =
-- agora); o log de alterações (0017) guarda quem revisou e quando.
--
-- Riscos existentes: a última revisão passa a ser a data de cadastro (nunca
-- foram revisados), o que já deixa vencidos os que passaram do prazo.
--
-- Rodar: psql "$DATABASE_URL" -f db/migrations/0018_revisao_periodica.sql

BEGIN;

CREATE TABLE IF NOT EXISTS parametros_revisao (
  nivel text PRIMARY KEY CHECK (nivel IN ('Baixo', 'Médio', 'Alto', 'Crítico')),
  dias integer NOT NULL CHECK (dias > 0)
);

INSERT INTO parametros_revisao (nivel, dias) VALUES
  ('Crítico', 30),
  ('Alto', 90),
  ('Médio', 180),
  ('Baixo', 365)
ON CONFLICT (nivel) DO NOTHING;

-- Mudanças nos prazos também entram no log de alterações.
DROP TRIGGER IF EXISTS trg_log_alteracoes ON parametros_revisao;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON parametros_revisao
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();

ALTER TABLE riscos ADD COLUMN IF NOT EXISTS revisado_em timestamptz;
UPDATE riscos SET revisado_em = criado_em WHERE revisado_em IS NULL;
ALTER TABLE riscos ALTER COLUMN revisado_em SET DEFAULT now();
ALTER TABLE riscos ALTER COLUMN revisado_em SET NOT NULL;

-- Próxima revisão de cada risco (fonte única para telas e indicadores).
CREATE OR REPLACE VIEW riscos_revisao AS
SELECT
  r.id AS risco_id,
  r.revisado_em,
  pr.dias AS dias_revisao,
  ((r.revisado_em AT TIME ZONE 'America/Sao_Paulo')::date + pr.dias) AS proxima_revisao
FROM riscos r
LEFT JOIN parametros_revisao pr ON pr.nivel = r.impacto_qualitativo;

COMMIT;
