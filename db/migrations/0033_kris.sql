-- B21 · Indicadores-chave de risco (KRIs) a partir dos pontos de gatilho.
--
-- - kris: o indicador (métrica, unidade, direção, limiares amarelo/vermelho,
--   fonte, frequência), sempre ligado a um risco. codigo = KRI-001...
-- - kri_medicoes: valores medidos (manual ou importado), um por data de
--   referência, com a faixa calculada na gravação.
-- - riscos.revisao_antecipada_em/_motivo: medição no vermelho antecipa a
--   revisão do risco. A view riscos_revisao ganha a coluna revisao_antecipada
--   (verdadeira enquanto o risco não for revisado depois do alerta); a fila de
--   revisões vencidas passa a incluir esses riscos.
-- - fn_log_alteracoes: medições e KRIs aparecem na linha do tempo do risco.

BEGIN;

CREATE TABLE IF NOT EXISTS kris (
  id serial PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  metrica text NOT NULL,
  unidade text NOT NULL,
  direcao text NOT NULL CHECK (direcao IN ('maior_pior', 'menor_pior')),
  limite_amarelo numeric NOT NULL,
  limite_vermelho numeric NOT NULL,
  fonte text NOT NULL,
  frequencia text NOT NULL CHECK (frequencia IN ('Semanal', 'Quinzenal', 'Mensal', 'Trimestral')),
  risco_id integer NOT NULL REFERENCES riscos(id) ON DELETE CASCADE,
  responsavel_email text,
  responsavel_nome text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por_email text,
  CHECK ((direcao = 'maior_pior' AND limite_amarelo < limite_vermelho)
      OR (direcao = 'menor_pior' AND limite_amarelo > limite_vermelho))
);
CREATE INDEX IF NOT EXISTS idx_kris_risco ON kris (risco_id);

CREATE TABLE IF NOT EXISTS kri_medicoes (
  id serial PRIMARY KEY,
  kri_id integer NOT NULL REFERENCES kris(id) ON DELETE CASCADE,
  referencia date NOT NULL,
  valor numeric NOT NULL,
  faixa text NOT NULL CHECK (faixa IN ('verde', 'amarelo', 'vermelho')),
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'importado')),
  observacao text,
  registrado_por_email text,
  registrado_por_nome text,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kri_id, referencia)
);

ALTER TABLE riscos ADD COLUMN IF NOT EXISTS revisao_antecipada_em timestamptz;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS revisao_antecipada_motivo text;

CREATE OR REPLACE VIEW riscos_revisao AS
SELECT
  r.id AS risco_id,
  r.revisado_em,
  pr.dias AS dias_revisao,
  CASE
    WHEN r.status = 'Aceito' THEN (
      SELECT a.valido_ate FROM aceitacoes_risco a
      WHERE a.risco_id = r.id AND a.situacao = 'Aprovada'
      ORDER BY a.id DESC LIMIT 1
    )
    ELSE ((r.revisado_em AT TIME ZONE 'America/Sao_Paulo')::date + pr.dias)
  END AS proxima_revisao,
  (r.revisao_antecipada_em IS NOT NULL
    AND (r.revisado_em IS NULL OR r.revisao_antecipada_em > r.revisado_em)) AS revisao_antecipada,
  r.revisao_antecipada_motivo
FROM riscos r
LEFT JOIN parametros_revisao pr ON pr.nivel = r.impacto_qualitativo;

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
  ELSIF TG_TABLE_NAME IN ('fatores_risco', 'planos_acao', 'aceitacoes_risco', 'ocorrencias_risco', 'kris') THEN
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

DROP TRIGGER IF EXISTS trg_log_alteracoes ON kris;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON kris
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();
DROP TRIGGER IF EXISTS trg_log_alteracoes ON kri_medicoes;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON kri_medicoes
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();

COMMIT;
