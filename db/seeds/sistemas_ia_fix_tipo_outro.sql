-- "Outro" deixou de ser uma opção válida de Tipo. Reclassifica os 3
-- sistemas que já usavam esse valor (no catálogo e nos registros de
-- demonstração já em produção) para "Texto/Chat" — o mais próximo entre
-- as categorias restantes, já que os três (ElevenLabs, Otter.ai,
-- Fireflies.ai) lidam com transcrição/geração de texto e voz.
-- Idempotente — pode rodar mais de uma vez sem erro.

UPDATE catalogo_sistemas_ia
SET tipo = 'Texto/Chat'
WHERE nome IN ('ElevenLabs', 'Otter.ai', 'Fireflies.ai') AND tipo = 'Outro';

UPDATE sistemas_ia
SET tipo = 'Texto/Chat'
WHERE sistema IN ('ElevenLabs', 'Otter.ai', 'Fireflies.ai') AND tipo = 'Outro';
