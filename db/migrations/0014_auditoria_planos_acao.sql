-- Auditoria dos encerramentos de Planos de Ação (Gestão de Riscos).
--
-- Fluxo: o plano é concluído com pelo menos uma evidência anexada e fica
-- "Pendente" de auditoria. Gestor, coordenador ou analista sênior de SI
-- classifica como "Conforme" (evidência validada, comentário opcional) ou
-- "Não conforme" (comentário obrigatório; o plano volta a ficar Aberto para
-- correção). Um risco só pode virar Mitigado com todos os planos Conforme.

ALTER TABLE planos_acao
  ADD COLUMN IF NOT EXISTS concluido_em timestamptz,
  ADD COLUMN IF NOT EXISTS auditoria_status text
    CHECK (auditoria_status IN ('Pendente', 'Conforme', 'Não conforme')),
  ADD COLUMN IF NOT EXISTS auditado_em timestamptz,
  ADD COLUMN IF NOT EXISTS auditado_por_nome text,
  ADD COLUMN IF NOT EXISTS auditado_por_email text,
  ADD COLUMN IF NOT EXISTS auditoria_comentario text;

-- Planos que já estavam concluídos antes da auditoria existir entram na fila.
UPDATE planos_acao
SET auditoria_status = 'Pendente', concluido_em = COALESCE(concluido_em, now())
WHERE status = 'Concluído' AND auditoria_status IS NULL;

CREATE TABLE IF NOT EXISTS planos_acao_evidencias (
  id serial PRIMARY KEY,
  plano_acao_id integer NOT NULL REFERENCES planos_acao(id) ON DELETE CASCADE,
  descricao text,
  nome_arquivo text NOT NULL,
  tipo_arquivo text NOT NULL,
  tamanho_bytes integer NOT NULL,
  arquivo_url text NOT NULL,
  enviado_por_nome text,
  enviado_por_email text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidencias_plano ON planos_acao_evidencias (plano_acao_id);

-- Histórico de todas as decisões de auditoria (um plano pode ser reprovado,
-- corrigido e auditado de novo).
CREATE TABLE IF NOT EXISTS planos_acao_auditorias (
  id serial PRIMARY KEY,
  plano_acao_id integer NOT NULL REFERENCES planos_acao(id) ON DELETE CASCADE,
  resultado text NOT NULL CHECK (resultado IN ('Conforme', 'Não conforme')),
  comentario text,
  auditor_nome text,
  auditor_email text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auditorias_plano ON planos_acao_auditorias (plano_acao_id);
