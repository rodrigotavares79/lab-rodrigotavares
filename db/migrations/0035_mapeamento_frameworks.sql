-- B24 · Mapeamento curado de frameworks.
--
-- - riscos_controles: decisão sobre cada controle sugerido para um risco.
--   confirmado (com status Implementado / Parcial / Ausente) ou descartado
--   (não volta a ser sugerido). A palavra-chave só sugere.
-- - cenario_controles: biblioteca de cenários (B27) → controles, revisada
--   manualmente; vira sugestão "da biblioteca" para os riscos do cenário.
-- - fn_log_alteracoes: decisões entram na linha do tempo do risco.

BEGIN;

CREATE TABLE IF NOT EXISTS riscos_controles (
  id serial PRIMARY KEY,
  risco_id integer NOT NULL REFERENCES riscos(id) ON DELETE CASCADE,
  framework text NOT NULL CHECK (framework IN ('cis', 'nist', 'iso')),
  controle_id text NOT NULL,
  controle_titulo text NOT NULL,
  situacao text NOT NULL CHECK (situacao IN ('confirmado', 'descartado')),
  status text CHECK (status IN ('Implementado', 'Parcial', 'Ausente')),
  fonte text NOT NULL DEFAULT 'manual' CHECK (fonte IN ('biblioteca', 'palavra-chave', 'manual')),
  observacao text,
  decidido_por_email text,
  decidido_por_nome text,
  decidido_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (risco_id, framework, controle_id),
  CHECK (situacao = 'descartado' OR status IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_riscos_controles_risco ON riscos_controles (risco_id);

CREATE TABLE IF NOT EXISTS cenario_controles (
  id serial PRIMARY KEY,
  cenario_id integer NOT NULL REFERENCES cenarios_risco(id) ON DELETE CASCADE,
  framework text NOT NULL CHECK (framework IN ('cis', 'nist', 'iso')),
  controle_id text NOT NULL,
  controle_titulo text NOT NULL,
  revisado_por_email text,
  revisado_por_nome text,
  revisado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cenario_id, framework, controle_id)
);

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
  ELSIF TG_TABLE_NAME IN ('fatores_risco', 'planos_acao', 'aceitacoes_risco', 'ocorrencias_risco', 'kris', 'riscos_controles') THEN
    v_risco := COALESCE(v_new->>'risco_id', v_old->>'risco_id')::integer;
  ELSIF TG_TABLE_NAME = 'kri_medicoes' THEN
    SELECT risco_id INTO v_risco FROM kris WHERE id = COALESCE(v_new->>'kri_id', v_old->>'kri_id')::integer;
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

DROP TRIGGER IF EXISTS trg_log_alteracoes ON riscos_controles;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON riscos_controles
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();
DROP TRIGGER IF EXISTS trg_log_alteracoes ON cenario_controles;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON cenario_controles
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();

COMMIT;
