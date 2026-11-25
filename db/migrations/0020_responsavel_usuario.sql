-- B09 · Responsável de ação vinculado a um usuário do sistema.
--
-- acoes.responsavel_email identifica o usuário (Clerk) responsável pela ação;
-- acoes.responsavel continua guardando o nome exibido. Ações antigas, com
-- responsável em texto livre, ficam com responsavel_email vazio ("não
-- vinculado") até alguém vinculá-las a um usuário na tela do risco.
--
-- Rodar: psql "$DATABASE_URL" -f db/migrations/0020_responsavel_usuario.sql

BEGIN;

ALTER TABLE acoes ADD COLUMN IF NOT EXISTS responsavel_email text;
CREATE INDEX IF NOT EXISTS idx_acoes_responsavel_email ON acoes (lower(responsavel_email));

COMMIT;
