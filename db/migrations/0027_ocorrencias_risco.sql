-- B19 · Nova ocorrência de um risco existente.
--
-- Em vez de cadastrar um risco repetido, quem identifica de novo um risco que
-- já existe no projeto registra uma ocorrência nele: data, fonte, quem
-- levantou e uma observação. As ocorrências aparecem na tela do risco e na
-- linha do tempo (fn_log_alteracoes passa a ligar ocorrencias_risco ao risco).

BEGIN;

CREATE TABLE IF NOT EXISTS ocorrencias_risco (
  id serial PRIMARY KEY,
  risco_id integer NOT NULL REFERENCES riscos(id) ON DELETE CASCADE,
  data_levantamento date,
  fonte text,
  observacao text NOT NULL,
  registrado_por_email text NOT NULL,
  registrado_por_nome text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_risco_risco ON ocorrencias_risco (risco_id);

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
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD) - 'arquivo_url' - 'carta_url'; END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW) - 'arquivo_url' - 'carta_url'; END IF;
  IF TG_TABLE_NAME = 'riscos' THEN
    v_old := v_old - 'titulo';
    v_new := v_new - 'titulo';
  END IF;
  v_id := COALESCE(v_new->>'id', v_old->>'id');

  IF TG_TABLE_NAME = 'riscos' THEN
    v_risco := v_id::integer;
  ELSIF TG_TABLE_NAME IN ('fatores_risco', 'planos_acao', 'aceitacoes_risco', 'ocorrencias_risco') THEN
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

DROP TRIGGER IF EXISTS trg_log_alteracoes ON ocorrencias_risco;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON ocorrencias_risco
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();

COMMIT;
