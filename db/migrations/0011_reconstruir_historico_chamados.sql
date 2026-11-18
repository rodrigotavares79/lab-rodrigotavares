-- Reconstrói o histórico dos chamados criados antes de a tabela
-- chamados_historico existir (ex.: dados de teste e importação do Bubble),
-- para que nenhum chamado apareça com "Nenhuma movimentação registrada".
--
-- 1) Abertura: todo chamado sem linha de abertura (status_anterior nulo)
--    ganha uma, com a data e o autor da abertura.
-- 2) Status atual: chamado que não está mais "Novo" e não tem nenhuma
--    movimentação registrada ganha uma linha levando ao status atual, com a
--    data da última atualização e a última justificativa conhecida. O autor
--    fica como "Registro reconstruído", porque quem movimentou não foi
--    guardado na época.
--
-- Rode isso no SQL Editor do Neon (ou via
-- `psql "$DATABASE_URL" -f db/migrations/0011_reconstruir_historico_chamados.sql`).
-- Idempotente — pode rodar mais de uma vez sem duplicar linhas.

INSERT INTO chamados_historico (chamado_id, status_anterior, status_novo, justificativa, autor_email, autor_nome, criado_em)
SELECT c.id, NULL, 'Novo', NULL, c.aberto_por_email, c.aberto_por_nome, c.criado_em
FROM chamados c
WHERE NOT EXISTS (
  SELECT 1 FROM chamados_historico h WHERE h.chamado_id = c.id AND h.status_anterior IS NULL
);

INSERT INTO chamados_historico (
  chamado_id, status_anterior, status_novo, justificativa, fornecedor_id, global, autor_email, autor_nome, criado_em
)
SELECT
  c.id,
  'Novo',
  c.status,
  COALESCE(
    'Registro reconstruído — ' || NULLIF(trim(c.justificativa_ultima_movimentacao), ''),
    'Registro reconstruído — movimentação feita antes de o histórico existir.'
  ),
  c.fornecedor_id,
  c.global,
  NULL,
  'Registro reconstruído',
  GREATEST(c.atualizado_em, c.criado_em + interval '1 second')
FROM chamados c
WHERE c.status <> 'Novo'
  AND NOT EXISTS (
    SELECT 1 FROM chamados_historico h WHERE h.chamado_id = c.id AND h.status_anterior IS NOT NULL
  );
