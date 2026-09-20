-- Redistribui as datas de cadastro dos 35 registros de demonstração
-- (ver db/seeds/sistemas_ia_demo.sql) de "tudo em setembro" pra uma
-- tendência de crescimento jan->set/2026, só pra deixar o gráfico
-- "Sistemas Cadastrados por Mês" do Dashboard mais interessante. Não
-- idempotente relevante aqui — pode rodar de novo, só reatribui as
-- mesmas datas.

UPDATE sistemas_ia SET criado_em = '2026-01-02T09:00:00Z' WHERE sistema = 'Claude';
UPDATE sistemas_ia SET criado_em = '2026-02-02T10:13:00Z' WHERE sistema = 'ChatGPT';
UPDATE sistemas_ia SET criado_em = '2026-02-27T11:26:00Z' WHERE sistema = 'Google Gemini';
UPDATE sistemas_ia SET criado_em = '2026-03-02T12:39:00Z' WHERE sistema = 'Microsoft Copilot';
UPDATE sistemas_ia SET criado_em = '2026-03-15T13:52:00Z' WHERE sistema = 'GitHub Copilot';
UPDATE sistemas_ia SET criado_em = '2026-03-27T14:05:00Z' WHERE sistema = 'Mistral AI';
UPDATE sistemas_ia SET criado_em = '2026-04-02T15:18:00Z' WHERE sistema = 'DeepSeek';
UPDATE sistemas_ia SET criado_em = '2026-04-15T16:31:00Z' WHERE sistema = 'Perplexity';
UPDATE sistemas_ia SET criado_em = '2026-04-27T09:44:00Z' WHERE sistema = 'Meta AI';
UPDATE sistemas_ia SET criado_em = '2026-05-02T10:57:00Z' WHERE sistema = 'Llama';
UPDATE sistemas_ia SET criado_em = '2026-05-10T11:10:00Z' WHERE sistema = 'Midjourney';
UPDATE sistemas_ia SET criado_em = '2026-05-19T12:23:00Z' WHERE sistema = 'DALL-E';
UPDATE sistemas_ia SET criado_em = '2026-05-27T13:36:00Z' WHERE sistema = 'Stable Diffusion';
UPDATE sistemas_ia SET criado_em = '2026-06-02T14:49:00Z' WHERE sistema = 'Adobe Firefly';
UPDATE sistemas_ia SET criado_em = '2026-06-10T15:02:00Z' WHERE sistema = 'Leonardo AI';
UPDATE sistemas_ia SET criado_em = '2026-06-19T16:15:00Z' WHERE sistema = 'Runway';
UPDATE sistemas_ia SET criado_em = '2026-06-27T09:28:00Z' WHERE sistema = 'Synthesia';
UPDATE sistemas_ia SET criado_em = '2026-07-02T10:41:00Z' WHERE sistema = 'HeyGen';
UPDATE sistemas_ia SET criado_em = '2026-07-08T11:54:00Z' WHERE sistema = 'Pika Labs';
UPDATE sistemas_ia SET criado_em = '2026-07-15T12:07:00Z' WHERE sistema = 'Sora';
UPDATE sistemas_ia SET criado_em = '2026-07-21T13:20:00Z' WHERE sistema = 'ElevenLabs';
UPDATE sistemas_ia SET criado_em = '2026-07-27T14:33:00Z' WHERE sistema = 'Notion AI';
UPDATE sistemas_ia SET criado_em = '2026-08-02T15:46:00Z' WHERE sistema = 'Grammarly';
UPDATE sistemas_ia SET criado_em = '2026-08-07T16:59:00Z' WHERE sistema = 'Jasper';
UPDATE sistemas_ia SET criado_em = '2026-08-12T09:12:00Z' WHERE sistema = 'Copy.ai';
UPDATE sistemas_ia SET criado_em = '2026-08-17T10:25:00Z' WHERE sistema = 'Codeium';
UPDATE sistemas_ia SET criado_em = '2026-08-22T11:38:00Z' WHERE sistema = 'Cursor';
UPDATE sistemas_ia SET criado_em = '2026-08-27T12:51:00Z' WHERE sistema = 'Tabnine';
UPDATE sistemas_ia SET criado_em = '2026-09-02T13:04:00Z' WHERE sistema = 'Amazon Q Developer';
UPDATE sistemas_ia SET criado_em = '2026-09-05T14:17:00Z' WHERE sistema = 'Replit AI';
UPDATE sistemas_ia SET criado_em = '2026-09-07T15:30:00Z' WHERE sistema = 'v0';
UPDATE sistemas_ia SET criado_em = '2026-09-10T16:43:00Z' WHERE sistema = 'Character.AI';
UPDATE sistemas_ia SET criado_em = '2026-09-13T09:56:00Z' WHERE sistema = 'Otter.ai';
UPDATE sistemas_ia SET criado_em = '2026-09-15T10:09:00Z' WHERE sistema = 'Fireflies.ai';
UPDATE sistemas_ia SET criado_em = '2026-09-18T11:22:00Z' WHERE sistema = 'Wolfram Alpha';
