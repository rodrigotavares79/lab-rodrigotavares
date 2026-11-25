-- B07 · Segregação de funções na auditoria de planos.
--
-- planos_acao.criado_por_email / criado_por_nome: quem criou o plano. Planos
-- criados depois da trilha de auditoria (0017) recebem o autor a partir do
-- log; os anteriores ficam sem criador registrado.
--
-- eventos_seguranca: registro (só inserção) de tentativas bloqueadas, como
-- auditar um plano em que o auditor tem conflito. Entra no CSV do log.
--
-- Rodar: psql "$DATABASE_URL" -f db/migrations/0021_segregacao_funcoes.sql

BEGIN;

ALTER TABLE planos_acao
  ADD COLUMN IF NOT EXISTS criado_por_email text,
  ADD COLUMN IF NOT EXISTS criado_por_nome text;

UPDATE planos_acao pa
SET criado_por_email = l.usuario_email,
    criado_por_nome = l.usuario_nome
FROM log_alteracoes l
WHERE l.tabela = 'planos_acao'
  AND l.operacao = 'INSERT'
  AND l.origem = 'aplicacao'
  AND l.registro_id = pa.id::text
  AND pa.criado_por_email IS NULL;

CREATE TABLE IF NOT EXISTS eventos_seguranca (
  id bigserial PRIMARY KEY,
  ocorrido_em timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL,
  usuario_email text NOT NULL,
  usuario_nome text,
  risco_id integer,
  registro text,
  detalhe text
);
CREATE INDEX IF NOT EXISTS idx_eventos_seguranca_data ON eventos_seguranca (ocorrido_em);

CREATE OR REPLACE FUNCTION fn_somente_insercao() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% só aceita inserção (% recusado).', TG_TABLE_NAME, TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_somente_insercao ON eventos_seguranca;
CREATE TRIGGER trg_somente_insercao
  BEFORE UPDATE OR DELETE ON eventos_seguranca
  FOR EACH ROW EXECUTE FUNCTION fn_somente_insercao();

DROP TRIGGER IF EXISTS trg_sem_truncate ON eventos_seguranca;
CREATE TRIGGER trg_sem_truncate
  BEFORE TRUNCATE ON eventos_seguranca
  FOR EACH STATEMENT EXECUTE FUNCTION fn_somente_insercao();

COMMIT;
