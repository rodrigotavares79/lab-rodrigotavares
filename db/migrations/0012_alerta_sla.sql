-- Alerta automático de estouro de SLA para os conselheiros.
--
-- chamados.sla_alerta_prazo guarda o prazo (prazo_sla) para o qual o alerta
-- já foi enviado: cada estouro gera um único alerta, e um chamado reaberto
-- (que ganha prazo novo) volta a ser monitorado.
-- condominio_tarefas controla a última execução da verificação, para ela
-- não rodar em excesso quando é disparada por várias fontes.
--
-- Rode isso no SQL Editor do Neon (ou via
-- `psql "$DATABASE_URL" -f db/migrations/0012_alerta_sla.sql`).
-- Idempotente — pode rodar mais de uma vez sem erro.

ALTER TABLE chamados ADD COLUMN IF NOT EXISTS sla_alerta_prazo timestamptz;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS sla_alerta_em timestamptz;

CREATE TABLE IF NOT EXISTS condominio_tarefas (
  nome text PRIMARY KEY,
  ultima_execucao timestamptz NOT NULL DEFAULT '-infinity'
);
INSERT INTO condominio_tarefas (nome) VALUES ('alerta_sla') ON CONFLICT (nome) DO NOTHING;

-- Chamados que JÁ estavam vencidos antes desta funcionalidade não geram
-- alerta retroativo (evita uma avalanche de e-mails no primeiro dia).
UPDATE chamados
SET sla_alerta_prazo = prazo_sla, sla_alerta_em = now()
WHERE sla_alerta_prazo IS NULL
  AND status NOT IN ('Resolvido', 'Cancelado')
  AND prazo_sla < now();
