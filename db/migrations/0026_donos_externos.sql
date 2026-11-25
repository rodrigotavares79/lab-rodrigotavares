-- B14 (complemento) · Dono do risco sem acesso ao sistema.
--
-- - contatos_risco: pessoas de negócio que podem ser donas de risco sem ter
--   conta no sistema (nome, e-mail, área, cargo, situação).
-- - riscos.dono_contato_id: quando o dono é um contato. dono_email/dono_nome
--   continuam preenchidos (cópia do contato) para listas e filtros.
-- - riscos.ponto_focal_email/nome: usuário Analista GRC que atualiza o risco
--   em nome do dono externo. Obrigatório quando o dono é contato.

BEGIN;

CREATE TABLE IF NOT EXISTS contatos_risco (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  email text NOT NULL,
  area text NOT NULL,
  cargo text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por_email text
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_contatos_risco_email ON contatos_risco (lower(email));

DROP TRIGGER IF EXISTS trg_log_alteracoes ON contatos_risco;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON contatos_risco
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();

ALTER TABLE riscos ADD COLUMN IF NOT EXISTS dono_contato_id integer REFERENCES contatos_risco(id);
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS ponto_focal_email text;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS ponto_focal_nome text;
ALTER TABLE riscos DROP CONSTRAINT IF EXISTS riscos_dono_externo_tem_ponto_focal;
ALTER TABLE riscos ADD CONSTRAINT riscos_dono_externo_tem_ponto_focal
  CHECK (dono_contato_id IS NULL OR ponto_focal_email IS NOT NULL);

COMMIT;
