-- Histórico de movimentações do chamado — cada mudança de status vira uma
-- linha própria, em vez de sobrescrever um único campo
-- (justificativa_ultima_movimentacao), que fazia o histórico "sumir" a
-- cada atualização.
-- Rode isso no SQL Editor do Neon (ou via
-- `psql "$DATABASE_URL" -f db/migrations/0007_chamados_historico.sql`).
-- Idempotente — pode rodar mais de uma vez sem erro.

CREATE TABLE IF NOT EXISTS chamados_historico (
  id serial PRIMARY KEY,
  chamado_id integer NOT NULL REFERENCES chamados(id),
  status_anterior text,
  status_novo text NOT NULL,
  justificativa text,
  fornecedor_id integer REFERENCES fornecedores(id),
  global boolean,
  autor_email text,
  autor_nome text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chamados_historico_chamado_id ON chamados_historico(chamado_id);
