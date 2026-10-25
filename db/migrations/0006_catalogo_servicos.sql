-- Renomeia tipos_chamado para catalogo_servicos e adiciona categoria,
-- urgência (agora fixa por serviço, escolhida aqui — não mais digitada na
-- abertura do chamado) e tipo (Problema / Demanda).
-- Rode isso no SQL Editor do Neon (ou via
-- `psql "$DATABASE_URL" -f db/migrations/0006_catalogo_servicos.sql`).
-- Idempotente — pode rodar mais de uma vez sem erro.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tipos_chamado')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalogo_servicos') THEN
    ALTER TABLE tipos_chamado RENAME TO catalogo_servicos;
  END IF;
END $$;

ALTER TABLE catalogo_servicos ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE catalogo_servicos ADD COLUMN IF NOT EXISTS urgencia text;
ALTER TABLE catalogo_servicos ADD COLUMN IF NOT EXISTS tipo text;
