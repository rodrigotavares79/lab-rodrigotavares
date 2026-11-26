-- B22 · Fotos mensais dos indicadores e tendências.
--
-- fotos_indicadores guarda, por mês (referencia = 1º dia do mês) e por
-- projeto (projeto_id NULL = consolidado), os indicadores do Gestão de
-- Riscos naquele momento. A rotina diária (/api/cron/fotos-mensais) atualiza
-- a foto do mês corrente; no dia 1 grava o fechamento do mês anterior. Assim
-- a foto de cada mês fica com o estado do fechamento.

BEGIN;

CREATE TABLE IF NOT EXISTS fotos_indicadores (
  id serial PRIMARY KEY,
  referencia date NOT NULL CHECK (extract(day FROM referencia) = 1),
  projeto_id integer REFERENCES projetos(id) ON DELETE CASCADE,
  dados jsonb NOT NULL,
  capturado_em timestamptz NOT NULL DEFAULT now(),
  origem text NOT NULL DEFAULT 'rotina' CHECK (origem IN ('rotina', 'manual'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fotos_indicadores_mes_projeto
  ON fotos_indicadores (referencia, COALESCE(projeto_id, 0));

COMMIT;
