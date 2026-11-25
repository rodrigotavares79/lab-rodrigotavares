-- B02 · Tratamento obrigatório para riscos Alto e Crítico (Política, item 4).
--
-- parametros_politica guarda parâmetros numéricos da política editáveis sem
-- mudar código. prazo_tratamento_dias: quantos dias, a partir do cadastro, um
-- risco Alto ou Crítico pode ficar sem tratamento definido antes de entrar na
-- fila "Sem tratamento definido". Hoje "tratamento definido" = pelo menos um
-- plano de ação; a aceitação formal (Carta de Risco, B16) entrará aqui depois.
-- Mudanças nos parâmetros entram no log de alterações (0017).
--
-- Rodar: psql "$DATABASE_URL" -f db/migrations/0019_prazo_tratamento.sql

BEGIN;

CREATE TABLE IF NOT EXISTS parametros_politica (
  chave text PRIMARY KEY,
  valor integer NOT NULL CHECK (valor >= 0),
  descricao text
);

INSERT INTO parametros_politica (chave, valor, descricao) VALUES
  ('prazo_tratamento_dias', 15, 'Dias, a partir do cadastro, para um risco Alto ou Crítico ter tratamento definido')
ON CONFLICT (chave) DO NOTHING;

DROP TRIGGER IF EXISTS trg_log_alteracoes ON parametros_politica;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON parametros_politica
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();

-- Situação de tratamento de cada risco ativo Alto ou Crítico (fonte única).
CREATE OR REPLACE VIEW riscos_tratamento AS
SELECT
  r.id AS risco_id,
  r.projeto_id,
  r.impacto_qualitativo,
  (SELECT COUNT(*) FROM planos_acao pa WHERE pa.risco_id = r.id)::int AS planos,
  ((r.criado_em AT TIME ZONE 'America/Sao_Paulo')::date
    + (SELECT valor FROM parametros_politica WHERE chave = 'prazo_tratamento_dias')) AS prazo_tratamento
FROM riscos r
WHERE r.status <> 'Mitigado'
  AND r.impacto_qualitativo IN ('Alto', 'Crítico');

COMMIT;
