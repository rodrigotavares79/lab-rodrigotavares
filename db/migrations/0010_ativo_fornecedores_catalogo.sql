-- Fornecedores e Catálogo de Serviços passam a poder ser editados e
-- desativados (nunca apagados): itens inativos somem da abertura de
-- chamados e da escolha de fornecedor, mas continuam ligados aos chamados
-- antigos e ao histórico.
-- Rode isso no SQL Editor do Neon (ou via
-- `psql "$DATABASE_URL" -f db/migrations/0010_ativo_fornecedores_catalogo.sql`).
-- Idempotente — pode rodar mais de uma vez sem erro.

ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS atualizado_em timestamptz;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS atualizado_por text;

ALTER TABLE catalogo_servicos ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE catalogo_servicos ADD COLUMN IF NOT EXISTS atualizado_em timestamptz;
ALTER TABLE catalogo_servicos ADD COLUMN IF NOT EXISTS atualizado_por text;
