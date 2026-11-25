-- B12 · Integridade das evidências.
--
-- planos_acao_evidencias.sha256: hash SHA-256 do arquivo, calculado no envio.
-- Permite provar que o arquivo avaliado pela Auditoria é o mesmo enviado.
-- Evidências anteriores ficam sem hash registrado.
--
-- Rodar: psql "$DATABASE_URL" -f db/migrations/0022_evidencias_sha256.sql

BEGIN;

ALTER TABLE planos_acao_evidencias ADD COLUMN IF NOT EXISTS sha256 text
  CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$');

COMMIT;
