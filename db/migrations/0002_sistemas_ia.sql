-- Inventário de Sistemas de IA — tabela nova, não afeta nada existente.
-- Rode isso no SQL Editor do Neon (ou via
-- `psql "$DATABASE_URL" -f db/migrations/0002_sistemas_ia.sql`).
-- Idempotente — pode rodar mais de uma vez sem erro.

CREATE TABLE IF NOT EXISTS sistemas_ia (
  id serial PRIMARY KEY,
  sistema text NOT NULL,
  tipo text,
  descricao text,
  area text,
  usuarios text,
  emails text,
  dados_tratados text,
  parecer_aprovado boolean,
  parecer_numero_chamado text,
  parecer_link text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
