-- B29 · Cadastro de projetos pela tela, com solicitação de inclusão.
--
-- - projetos: ganha ativo, descrição e autoria. Projeto não se apaga: inativo
--   some das listas de cadastro (riscos, ativos, assessments) e continua nos
--   filtros e relatórios. Nome único sem diferenciar maiúsculas e espaços.
-- - solicitacoes_projeto: quem não acha o projeto na lista pede a inclusão;
--   Administrador ou CISO aprova (cria o projeto, ou aponta um existente) ou
--   recusa com motivo. Quem pediu vê a decisão.
-- - Log de alterações nas duas tabelas e em assessment_perguntas, que agora
--   também tem tela (parametros_politica e parametros_revisao já tinham log).
--
-- Regras: lib/projetosRegras.ts (testes em tests/projetosRegras.test.mts).

BEGIN;

ALTER TABLE projetos ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS criado_em timestamptz DEFAULT now();
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS criado_por_email text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_projetos_nome ON projetos (lower(btrim(nome)));

CREATE TABLE IF NOT EXISTS solicitacoes_projeto (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  justificativa text NOT NULL,
  situacao text NOT NULL DEFAULT 'Pendente' CHECK (situacao IN ('Pendente', 'Aprovada', 'Recusada')),
  solicitado_por_email text NOT NULL,
  solicitado_por_nome text,
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  decidido_por_email text,
  decidido_por_nome text,
  decidido_em timestamptz,
  motivo_recusa text,
  projeto_id integer REFERENCES projetos(id),
  CHECK (situacao <> 'Recusada' OR btrim(coalesce(motivo_recusa, '')) <> ''),
  CHECK (situacao <> 'Aprovada' OR projeto_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_projeto_situacao ON solicitacoes_projeto (situacao);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projetos', 'solicitacoes_projeto', 'assessment_perguntas'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_log_alteracoes ON %I', t);
    EXECUTE format('CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes()', t);
  END LOOP;
END $$;

COMMIT;
