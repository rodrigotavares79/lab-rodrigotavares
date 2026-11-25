-- B16 · Opção de tratamento e aceitação formal do risco (Carta de Risco).
--
-- riscos.opcao_tratamento: Mitigar, Aceitar, Transferir ou Evitar.
-- riscos.status ganha "Aceito", alcançado só pela aprovação de uma
-- aceitação (aceitacoes_risco) com Carta de Risco anexada, por quem tem
-- alçada para o nível do risco (lib/perfisRiscos.ts) e não é quem pediu.
-- A aceitação vale até valido_ate (padrão 12 meses); vencida, o risco entra
-- em "Revisões vencidas" (view riscos_revisao).
-- Uma aceitação válida conta como tratamento definido (view
-- riscos_tratamento, B02).
--
-- Rodar: psql "$DATABASE_URL" -f db/migrations/0023_aceitacao_risco.sql

BEGIN;

ALTER TABLE riscos ADD COLUMN IF NOT EXISTS opcao_tratamento text
  CHECK (opcao_tratamento IN ('Mitigar', 'Aceitar', 'Transferir', 'Evitar'));

ALTER TABLE riscos DROP CONSTRAINT IF EXISTS riscos_status_valido;
ALTER TABLE riscos ADD CONSTRAINT riscos_status_valido
  CHECK (status IN ('Identificado', 'Em Tratamento', 'Mitigado', 'Aceito'));

CREATE TABLE IF NOT EXISTS aceitacoes_risco (
  id serial PRIMARY KEY,
  risco_id integer NOT NULL REFERENCES riscos(id) ON DELETE CASCADE,
  situacao text NOT NULL DEFAULT 'Pendente'
    CHECK (situacao IN ('Pendente', 'Aprovada', 'Recusada', 'Revogada')),
  justificativa text NOT NULL,
  validade_meses integer NOT NULL CHECK (validade_meses BETWEEN 1 AND 24),
  nivel_no_pedido text NOT NULL,
  carta_url text NOT NULL,
  carta_nome text NOT NULL,
  carta_tipo text NOT NULL,
  carta_tamanho integer NOT NULL,
  carta_sha256 text NOT NULL CHECK (carta_sha256 ~ '^[0-9a-f]{64}$'),
  solicitado_por_email text NOT NULL,
  solicitado_por_nome text,
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  decidido_por_email text,
  decidido_por_nome text,
  decidido_por_perfil text,
  decidido_em timestamptz,
  motivo_decisao text,
  valido_ate date,
  revogado_em timestamptz,
  revogado_por_email text
);
-- No máximo uma aceitação em andamento ou vigente por risco.
CREATE UNIQUE INDEX IF NOT EXISTS uq_aceitacao_ativa
  ON aceitacoes_risco (risco_id) WHERE situacao IN ('Pendente', 'Aprovada');

-- Log de alterações (0017): passa a cobrir aceitacoes_risco e a não gravar
-- a URL interna da carta.
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
  v_id := COALESCE(v_new->>'id', v_old->>'id');

  IF TG_TABLE_NAME = 'riscos' THEN
    v_risco := v_id::integer;
  ELSIF TG_TABLE_NAME IN ('fatores_risco', 'planos_acao', 'aceitacoes_risco') THEN
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


DROP TRIGGER IF EXISTS trg_log_alteracoes ON aceitacoes_risco;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON aceitacoes_risco
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();

-- B02: aceitação aprovada e dentro da validade conta como tratamento.
CREATE OR REPLACE VIEW riscos_tratamento AS
SELECT
  r.id AS risco_id,
  r.projeto_id,
  r.impacto_qualitativo,
  (SELECT COUNT(*) FROM planos_acao pa WHERE pa.risco_id = r.id)::int AS planos,
  ((r.criado_em AT TIME ZONE 'America/Sao_Paulo')::date
    + (SELECT valor FROM parametros_politica WHERE chave = 'prazo_tratamento_dias')) AS prazo_tratamento,
  EXISTS (
    SELECT 1 FROM aceitacoes_risco a
    WHERE a.risco_id = r.id AND a.situacao = 'Aprovada'
      AND a.valido_ate >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
  ) AS aceito_valido
FROM riscos r
WHERE r.status <> 'Mitigado'
  AND r.impacto_qualitativo IN ('Alto', 'Crítico');

-- B17: risco Aceito é revisto quando a aceitação vence.
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
  END AS proxima_revisao
FROM riscos r
LEFT JOIN parametros_revisao pr ON pr.nivel = r.impacto_qualitativo;

COMMIT;
