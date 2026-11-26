-- B18 · Apetite e tolerância a risco por categoria, versionados com aprovador.
--
-- - apetite_versoes: cada versão (Pendente, Vigente, Substituída, Recusada).
--   No máximo uma Pendente e uma Vigente por vez.
-- - apetite_limites: apetite e tolerância (nível da política) de cada
--   categoria numa versão. Tolerância nunca menor que o apetite.
-- - Os dois entram no log de alterações (B06).

BEGIN;

CREATE TABLE IF NOT EXISTS apetite_versoes (
  id serial PRIMARY KEY,
  versao integer NOT NULL UNIQUE,
  situacao text NOT NULL DEFAULT 'Pendente'
    CHECK (situacao IN ('Pendente', 'Vigente', 'Substituída', 'Recusada')),
  justificativa text NOT NULL,
  proposto_por_email text NOT NULL,
  proposto_por_nome text,
  proposto_em timestamptz NOT NULL DEFAULT now(),
  decidido_por_email text,
  decidido_por_nome text,
  decidido_por_perfil text,
  decidido_em timestamptz,
  motivo_decisao text,
  vigente_desde timestamptz,
  vigente_ate timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_apetite_uma_pendente ON apetite_versoes ((true)) WHERE situacao = 'Pendente';
CREATE UNIQUE INDEX IF NOT EXISTS uq_apetite_uma_vigente ON apetite_versoes ((true)) WHERE situacao = 'Vigente';

CREATE TABLE IF NOT EXISTS apetite_limites (
  id serial PRIMARY KEY,
  versao_id integer NOT NULL REFERENCES apetite_versoes(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  apetite text NOT NULL CHECK (apetite IN ('Baixo', 'Médio', 'Alto', 'Crítico')),
  tolerancia text NOT NULL CHECK (tolerancia IN ('Baixo', 'Médio', 'Alto', 'Crítico')),
  UNIQUE (versao_id, categoria),
  CHECK (array_position(ARRAY['Baixo','Médio','Alto','Crítico'], tolerancia)
         >= array_position(ARRAY['Baixo','Médio','Alto','Crítico'], apetite))
);

DROP TRIGGER IF EXISTS trg_log_alteracoes ON apetite_versoes;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON apetite_versoes
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();
DROP TRIGGER IF EXISTS trg_log_alteracoes ON apetite_limites;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON apetite_limites
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();

-- Aprovação atômica: a vigente vira Substituída e a pendente vira Vigente.
CREATE OR REPLACE FUNCTION fn_aprovar_apetite(p_id integer, p_email text, p_nome text, p_perfil text, p_motivo text)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE v_versao integer;
BEGIN
  PERFORM 1 FROM apetite_versoes WHERE id = p_id AND situacao = 'Pendente' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'proposta_nao_pendente'; END IF;
  UPDATE apetite_versoes SET situacao = 'Substituída', vigente_ate = now() WHERE situacao = 'Vigente';
  UPDATE apetite_versoes
     SET situacao = 'Vigente', vigente_desde = now(), decidido_por_email = p_email, decidido_por_nome = p_nome,
         decidido_por_perfil = p_perfil, decidido_em = now(), motivo_decisao = p_motivo
   WHERE id = p_id
   RETURNING versao INTO v_versao;
  RETURN v_versao;
END;
$$;

COMMIT;
