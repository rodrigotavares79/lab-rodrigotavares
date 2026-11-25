-- B06 · Trilha de auditoria (log de alterações) do Gestão de Riscos.
--
-- Triggers gravam em log_alteracoes toda criação, alteração e exclusão nas
-- tabelas do módulo, inclusive as feitas fora da aplicação (SQL Editor,
-- scripts). Quem fez a alteração vem das variáveis de sessão
-- app.usuario_email / app.usuario_nome, que a aplicação define na mesma
-- transação (lib/sqlAuditado.ts). Sem elas, o registro fica como
-- "banco: <usuário do Postgres>".
--
-- Alteração: uma linha por campo alterado (valor anterior e novo).
-- Criação e exclusão: uma linha com o registro inteiro.
-- O log só aceita inserção: UPDATE, DELETE e TRUNCATE nele são recusados.
--
-- Rodar: psql "$DATABASE_URL" -f db/migrations/0017_log_alteracoes.sql

BEGIN;

CREATE TABLE IF NOT EXISTS log_alteracoes (
  id bigserial PRIMARY KEY,
  ocorrido_em timestamptz NOT NULL DEFAULT now(),
  tabela text NOT NULL,
  registro_id text,
  risco_id integer,
  operacao text NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE')),
  campo text,
  valor_anterior jsonb,
  valor_novo jsonb,
  usuario_email text NOT NULL,
  usuario_nome text,
  origem text NOT NULL CHECK (origem IN ('aplicacao', 'banco')),
  transacao bigint NOT NULL DEFAULT txid_current()
);
CREATE INDEX IF NOT EXISTS idx_log_alteracoes_risco ON log_alteracoes (risco_id, ocorrido_em);
CREATE INDEX IF NOT EXISTS idx_log_alteracoes_data ON log_alteracoes (ocorrido_em);

CREATE OR REPLACE FUNCTION fn_log_alteracoes() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_id text;
  v_risco integer;
  v_plano text;
  v_email text := NULLIF(current_setting('app.usuario_email', true), '');
  v_nome text := NULLIF(current_setting('app.usuario_nome', true), '');
  v_origem text;
  k text;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD) - 'arquivo_url'; END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW) - 'arquivo_url'; END IF;
  v_id := COALESCE(v_new->>'id', v_old->>'id');

  IF TG_TABLE_NAME = 'riscos' THEN
    v_risco := v_id::integer;
  ELSIF TG_TABLE_NAME IN ('fatores_risco', 'planos_acao') THEN
    v_risco := COALESCE(v_new->>'risco_id', v_old->>'risco_id')::integer;
  ELSE
    v_plano := COALESCE(v_new->>'plano_acao_id', v_old->>'plano_acao_id');
    IF v_plano IS NOT NULL THEN
      SELECT risco_id INTO v_risco FROM planos_acao WHERE id = v_plano::integer;
    END IF;
  END IF;

  IF v_email IS NULL THEN
    v_email := 'banco: ' || session_user;
    v_origem := 'banco';
  ELSE
    v_origem := 'aplicacao';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    FOR k IN SELECT key FROM jsonb_each(v_new) LOOP
      IF (v_new -> k) IS DISTINCT FROM (v_old -> k) THEN
        INSERT INTO log_alteracoes (tabela, registro_id, risco_id, operacao, campo, valor_anterior, valor_novo, usuario_email, usuario_nome, origem)
        VALUES (TG_TABLE_NAME, v_id, v_risco, TG_OP, k, v_old -> k, v_new -> k, v_email, v_nome, v_origem);
      END IF;
    END LOOP;
  ELSE
    INSERT INTO log_alteracoes (tabela, registro_id, risco_id, operacao, campo, valor_anterior, valor_novo, usuario_email, usuario_nome, origem)
    VALUES (TG_TABLE_NAME, v_id, v_risco, TG_OP, NULL, v_old, v_new, v_email, v_nome, v_origem);
  END IF;

  RETURN NULL;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['riscos', 'fatores_risco', 'planos_acao', 'acoes', 'planos_acao_evidencias', 'planos_acao_auditorias'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_log_alteracoes ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes()',
      t
    );
  END LOOP;
END $$;

-- O log não pode ser alterado nem apagado.
CREATE OR REPLACE FUNCTION fn_log_somente_insercao() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'log_alteracoes só aceita inserção (% recusado).', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_somente_insercao ON log_alteracoes;
CREATE TRIGGER trg_log_somente_insercao
  BEFORE UPDATE OR DELETE ON log_alteracoes
  FOR EACH ROW EXECUTE FUNCTION fn_log_somente_insercao();

DROP TRIGGER IF EXISTS trg_log_sem_truncate ON log_alteracoes;
CREATE TRIGGER trg_log_sem_truncate
  BEFORE TRUNCATE ON log_alteracoes
  FOR EACH STATEMENT EXECUTE FUNCTION fn_log_somente_insercao();

COMMIT;
