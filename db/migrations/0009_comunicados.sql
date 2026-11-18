-- Quadro de mensagens (comunicados do síndico/administração) + controle de leitura.
-- Idempotente. psql "$DATABASE_URL" -f db/migrations/0009_comunicados.sql

CREATE TABLE IF NOT EXISTS comunicados (
  id serial PRIMARY KEY,
  titulo text NOT NULL,
  corpo text NOT NULL,
  categoria text NOT NULL DEFAULT 'Administração', -- Administração | Manutenção | Comunidade
  fixado boolean NOT NULL DEFAULT false,
  autor_email text,
  autor_nome text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comunicados_criado_em ON comunicados(criado_em DESC);

CREATE TABLE IF NOT EXISTS comunicados_leituras (
  comunicado_id integer NOT NULL REFERENCES comunicados(id) ON DELETE CASCADE,
  usuario_email text NOT NULL,
  lido_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comunicado_id, usuario_email)
);
