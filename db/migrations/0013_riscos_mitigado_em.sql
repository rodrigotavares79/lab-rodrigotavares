-- Data em que o risco passou para "Mitigado". Usada no gauge de mitigação
-- trimestral da página inicial do Gestão de Riscos. Riscos mitigados antes
-- desta migração ficam com NULL (data desconhecida) e não entram na conta.
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS mitigado_em timestamptz;
