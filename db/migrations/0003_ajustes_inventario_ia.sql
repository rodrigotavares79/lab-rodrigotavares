-- Ajustes no Inventário de Sistemas de IA:
-- 1) Catálogo de sistemas conhecidos, usado pra auto-preencher o Tipo no
--    cadastro (ver db/seeds/catalogo_sistemas_ia.sql).
-- 2) Área do usuário (separada da área responsável pelo sistema, já
--    existente em `area`) — o mesmo sistema pode ser "dono" de uma área e
--    usado por outra.
-- 3) Remoção do link de anexo do parecer de Cibersegurança (mantém só o
--    número do chamado).
--
-- Rode isso no SQL Editor do Neon (ou via
-- `psql "$DATABASE_URL" -f db/migrations/0003_ajustes_inventario_ia.sql`).
-- Idempotente — pode rodar mais de uma vez sem erro.

CREATE TABLE IF NOT EXISTS catalogo_sistemas_ia (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  tipo text NOT NULL
);

ALTER TABLE sistemas_ia
  ADD COLUMN IF NOT EXISTS area_usuario text,
  DROP COLUMN IF EXISTS parecer_link;
