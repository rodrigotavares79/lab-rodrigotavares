-- Preenche o histórico de chamados com ~6 meses de dados fictícios, pra dar
-- massa de verdade ao dashboard (tendência mês a mês, atividade mensal,
-- gráfico de bolhas, etc.) — a seed original (condominio_demo.sql) só cobre
-- os últimos dias.
--
-- Gera ~260 chamados espalhados de 5 a 185 dias atrás (não encosta nos
-- chamados "recentes" da seed original nem nos que você abriu manualmente),
-- usando os mesmos condôminos (Star Wars), o catálogo de serviços e os
-- fornecedores já cadastrados. Quanto mais antigo, maior a chance de já
-- estar Resolvido/Cancelado — pra imitar um histórico real.
--
-- Rode isso DEPOIS de catalogo_servicos e fornecedores já estarem
-- populados (ou seja, depois de condominio_demo.sql).
-- `psql "$DATABASE_URL" -f db/seeds/condominio_historico_6_meses.sql`
--
-- Idempotente: se já rodou antes (existe algum chamado com a descrição-
-- marcador abaixo), o INSERT principal não insere nada de novo. As duas
-- inserções de histórico também são protegidas por chamado/transição.

WITH condominos(id, nome, email, unidade) AS (
  VALUES
    (1,  'Luke Skywalker',   'luke.skywalker@tatooine.example',  'Bloco 1, Apto 101'),
    (2,  'Leia Organa',      'leia.organa@alderaan.example',     'Bloco 1, Apto 203'),
    (3,  'Han Solo',         'han.solo@corellia.example',        'Bloco 2, Apto 305'),
    (4,  'Chewbacca',        'chewbacca@kashyyyk.example',       'Bloco 2, Apto 410'),
    (5,  'Obi-Wan Kenobi',   'obiwan.kenobi@stewjon.example',    'Bloco 3, Cobertura'),
    (6,  'Yoda',             'yoda@dagobah.example',             'Bloco 1, Apto 102'),
    (7,  'Padmé Amidala',    'padme.amidala@naboo.example',      'Bloco 2, Apto 201'),
    (8,  'Lando Calrissian', 'lando.calrissian@socorro.example', 'Bloco 3, Apto 305'),
    (9,  'Rey Skywalker',    'rey.skywalker@jakku.example',      'Bloco 1, Apto 304'),
    (10, 'Finn',             'finn.fn2187@jakku.example',        'Bloco 2, Apto 108'),
    (11, 'Poe Dameron',      'poe.dameron@yavin.example',        'Bloco 3, Apto 220'),
    (12, 'Mace Windu',       'mace.windu@haruun-kal.example',    'Bloco 1, Apto 405'),
    (13, 'Ahsoka Tano',      'ahsoka.tano@shili.example',        'Bloco 2, Apto 112'),
    (14, 'Din Djarin',       'din.djarin@mandalore.example',     'Bloco 3, Apto 115')
),
servicos AS (
  SELECT id, nome, categoria, urgencia, sla_horas, row_number() OVER (ORDER BY id) AS rn
  FROM catalogo_servicos
),
contagens AS (
  SELECT (SELECT count(*) FROM condominos) AS n_condominos, (SELECT count(*) FROM servicos) AS n_servicos
),
plano AS (
  SELECT
    gs AS idx,
    5 + floor(random() * 181)::int AS dias_atras,
    floor(random() * 24)::int AS hora,
    1 + floor(random() * (SELECT n_condominos FROM contagens))::int AS condomino_id,
    1 + floor(random() * (SELECT n_servicos FROM contagens))::int AS servico_rn,
    random() AS r_status,
    random() AS r_global,
    random() AS r_atraso
  FROM generate_series(1, 260) AS gs
),
montado AS (
  SELECT
    cd.nome AS condomino_nome,
    cd.email AS condomino_email,
    cd.unidade AS condomino_unidade,
    s.id AS servico_id,
    s.nome AS servico_nome,
    s.categoria AS servico_categoria,
    s.urgencia AS servico_urgencia,
    s.sla_horas AS servico_sla_horas,
    now() - make_interval(days => p.dias_atras, hours => p.hora) AS criado_em,
    p.dias_atras,
    p.r_status,
    p.r_global,
    p.r_atraso
  FROM plano p
  JOIN condominos cd ON cd.id = p.condomino_id
  JOIN servicos s ON s.rn = p.servico_rn
),
definido AS (
  SELECT
    m.*,
    CASE
      WHEN m.dias_atras > 20 THEN
        CASE WHEN m.r_status < 0.78 THEN 'Resolvido'
             WHEN m.r_status < 0.92 THEN 'Cancelado'
             ELSE 'Reaberto' END
      WHEN m.dias_atras > 7 THEN
        CASE WHEN m.r_status < 0.55 THEN 'Resolvido'
             WHEN m.r_status < 0.70 THEN 'Cancelado'
             WHEN m.r_status < 0.85 THEN 'Em andamento'
             WHEN m.r_status < 0.95 THEN 'Aguardando fornecedor'
             ELSE 'Paralisado' END
      ELSE
        CASE WHEN m.r_status < 0.35 THEN 'Novo'
             WHEN m.r_status < 0.65 THEN 'Em andamento'
             WHEN m.r_status < 0.80 THEN 'Aguardando fornecedor'
             WHEN m.r_status < 0.90 THEN 'Resolvido'
             ELSE 'Paralisado' END
    END AS status,
    (m.r_global < 0.15) AS global
  FROM montado m
)
INSERT INTO chamados (
  titulo, descricao, tipo_id, urgencia, status, fornecedor_id, prazo_sla, global,
  aberto_por_email, aberto_por_nome, aberto_por_unidade, criado_em, atualizado_em
)
SELECT
  d.servico_nome || ' — ' || d.condomino_unidade,
  'Chamado de demonstração gerado para preencher o histórico de aproximadamente 6 meses (seed-historico-6-meses).',
  d.servico_id,
  d.servico_urgencia,
  d.status,
  CASE WHEN d.status <> 'Novo' THEN
    (SELECT f.id FROM fornecedores f WHERE f.categoria_servico = d.servico_categoria ORDER BY random() LIMIT 1)
  ELSE NULL END,
  d.criado_em + make_interval(hours => d.servico_sla_horas),
  d.global,
  d.condomino_email,
  d.condomino_nome,
  d.condomino_unidade,
  d.criado_em,
  CASE WHEN d.status <> 'Novo'
    THEN d.criado_em + make_interval(hours => (1 + floor(d.r_atraso * d.servico_sla_horas * 2))::int)
    ELSE d.criado_em
  END
FROM definido d
WHERE NOT EXISTS (
  SELECT 1 FROM chamados c2
  WHERE c2.descricao = 'Chamado de demonstração gerado para preencher o histórico de aproximadamente 6 meses (seed-historico-6-meses).'
);

-- Histórico: abertura de cada um.
INSERT INTO chamados_historico (chamado_id, status_anterior, status_novo, justificativa, fornecedor_id, global, autor_email, autor_nome, criado_em)
SELECT c.id, NULL, 'Novo', NULL, NULL, c.global, c.aberto_por_email, c.aberto_por_nome, c.criado_em
FROM chamados c
WHERE c.descricao = 'Chamado de demonstração gerado para preencher o histórico de aproximadamente 6 meses (seed-historico-6-meses).'
  AND NOT EXISTS (
    SELECT 1 FROM chamados_historico h
    WHERE h.chamado_id = c.id AND h.status_novo = 'Novo' AND h.status_anterior IS NULL
  );

-- Histórico: transição pro status final, pra quem saiu de "Novo".
INSERT INTO chamados_historico (chamado_id, status_anterior, status_novo, justificativa, fornecedor_id, global, autor_email, autor_nome, criado_em)
SELECT c.id, 'Novo', c.status,
       'Movimentação registrada automaticamente ao preencher o histórico (seed-historico-6-meses).',
       c.fornecedor_id, c.global, 'sindico@condominio.demo', 'Síndico (Admin)', c.atualizado_em
FROM chamados c
WHERE c.descricao = 'Chamado de demonstração gerado para preencher o histórico de aproximadamente 6 meses (seed-historico-6-meses).'
  AND c.status <> 'Novo'
  AND NOT EXISTS (
    SELECT 1 FROM chamados_historico h
    WHERE h.chamado_id = c.id AND h.status_novo = c.status AND h.status_anterior = 'Novo'
  );
