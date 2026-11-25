-- B14 · Dono do risco e ativo/processo afetado.
--
-- - riscos.dono_email / dono_nome: dono do risco (usuário do módulo),
--   distinto de quem levantou. Obrigatório em cadastro, importação e edição;
--   os riscos existentes ficam sem dono (fila "Riscos sem dono") até alguém
--   definir — decisão do dono do sistema, nada é atribuído automaticamente.
-- - sistemas_criticos vira o inventário de "Ativos e processos críticos":
--   tipo, área responsável, descrição e situação (ativo/inativo). Os custos
--   passam a ser opcionais (só ativos com custo entram no cálculo financeiro).
--   O risco continua apontando para ele por riscos.sistema_critico_id.

BEGIN;

ALTER TABLE riscos ADD COLUMN IF NOT EXISTS dono_email text;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS dono_nome text;
CREATE INDEX IF NOT EXISTS idx_riscos_dono_email ON riscos (lower(dono_email));

ALTER TABLE sistemas_criticos ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'Sistema';
ALTER TABLE sistemas_criticos DROP CONSTRAINT IF EXISTS sistemas_criticos_tipo_valido;
ALTER TABLE sistemas_criticos ADD CONSTRAINT sistemas_criticos_tipo_valido
  CHECK (tipo IN ('Sistema', 'Processo', 'Infraestrutura', 'Dados', 'Fornecedor'));
ALTER TABLE sistemas_criticos ADD COLUMN IF NOT EXISTS area_responsavel text;
ALTER TABLE sistemas_criticos ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE sistemas_criticos ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE sistemas_criticos ALTER COLUMN custo_indisponibilidade_hora DROP NOT NULL;
ALTER TABLE sistemas_criticos ALTER COLUMN custo_restauracao_hora_homem DROP NOT NULL;

-- Alterações no inventário também vão para o log de alterações.
DROP TRIGGER IF EXISTS trg_log_alteracoes ON sistemas_criticos;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON sistemas_criticos
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();

COMMIT;
