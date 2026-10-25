-- Limpeza do Catálogo de Serviços: remove duplicados e preenche
-- categoria/urgência/tipo que ficaram em branco (itens cadastrados antes
-- desses campos existirem, ou criados manualmente em teste).
--
-- Antes de apagar um serviço duplicado, reaponta qualquer chamado que já
-- o usa para o serviço "canônico" que fica — senão o DELETE falharia por
-- causa da chave estrangeira chamados.tipo_id.
--
-- Rode isso no SQL Editor do Neon (ou via
-- `psql "$DATABASE_URL" -f db/migrations/0008_limpar_catalogo_servicos.sql`).
-- Idempotente — pode rodar mais de uma vez sem erro (na segunda vez os
-- nomes antigos já não existem mais, então as instruções viram no-op).

-- 1) Reapontar chamados que usam os duplicados, antes de remover.

UPDATE chamados SET tipo_id = (SELECT id FROM catalogo_servicos WHERE nome = 'Vazamento hidráulico')
WHERE tipo_id IN (
  SELECT id FROM catalogo_servicos WHERE nome IN ('Hidráulica', 'Reparar Vazamento', 'Vazamento no teto')
);

UPDATE chamados SET tipo_id = (SELECT id FROM catalogo_servicos WHERE nome = 'Portão da garagem com defeito')
WHERE tipo_id IN (
  SELECT id FROM catalogo_servicos WHERE nome = 'Manutenção do Portão - Garagem'
);

UPDATE chamados SET tipo_id = (SELECT id FROM catalogo_servicos WHERE nome = 'Pintura de área comum')
WHERE tipo_id IN (
  SELECT id FROM catalogo_servicos WHERE nome = 'Pintura - Reparo/Manutenção'
);

-- 2) Remover os duplicados/legados agora sem nenhum chamado apontando pra eles.

DELETE FROM catalogo_servicos WHERE nome IN (
  'Hidráulica',
  'Reparar Vazamento',
  'Vazamento no teto',
  'Manutenção do Portão - Garagem',
  'Pintura - Reparo/Manutenção'
);

-- 3) Completar os que sobraram sem categoria/urgência/tipo.

UPDATE catalogo_servicos
SET nome = 'Portão da guarita com defeito',
    categoria = 'Portaria e Segurança',
    urgencia = 'Urgente',
    tipo = 'Problema'
WHERE nome = 'Manutenção do Portão - Guarita';

UPDATE catalogo_servicos
SET categoria = 'Manutenção Predial',
    urgencia = 'Baixa',
    tipo = 'Demanda'
WHERE nome = 'Pintura - Projeto';
