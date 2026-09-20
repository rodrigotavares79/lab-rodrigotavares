-- Histórico de revisões periódicas de cada sistema de IA cadastrado —
-- tabela nova, não afeta nada existente. Um sistema pode ter várias
-- revisões ao longo do tempo (6 em 6 meses se "Requer atenção" —
-- trata dados pessoais/sensíveis —, 1 em 1 ano caso contrário).
--
-- Rode isso no SQL Editor do Neon (ou via
-- `psql "$DATABASE_URL" -f db/migrations/0004_revisoes_sistemas_ia.sql`).
-- Idempotente — pode rodar mais de uma vez sem erro.

CREATE TABLE IF NOT EXISTS revisoes_sistemas_ia (
  id serial PRIMARY KEY,
  sistema_ia_id integer NOT NULL REFERENCES sistemas_ia(id) ON DELETE CASCADE,
  revisado_por text,
  data_revisao date NOT NULL,
  numero_chamado text,
  parecer_aprovado boolean,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revisoes_sistemas_ia_sistema_id
  ON revisoes_sistemas_ia (sistema_ia_id);
