-- Dados fictícios pra testar o módulo de Gestão de Condomínio: catálogo de
-- serviços típicos do ramo, alguns fornecedores, e uma leva de chamados
-- (condôminos com nomes de personagens de Star Wars) em status variados —
-- incluindo vários com SLA já vencido, pra ver o indicador (bolinha
-- vermelha) funcionando na lista e no detalhe.
--
-- Rode isso DEPOIS das migrations 0006 (catalogo_servicos) e 0007
-- (chamados_historico). Idempotente por nome/título — pode rodar mais de
-- uma vez sem duplicar linhas.
-- `psql "$DATABASE_URL" -f db/seeds/condominio_demo.sql`

-- =========================================================================
-- 1) Catálogo de Serviços
-- =========================================================================

INSERT INTO catalogo_servicos (nome, categoria, urgencia, tipo, sla_horas, criado_por)
SELECT * FROM (VALUES
  ('Vazamento hidráulico',               'Hidráulica',            'Urgente', 'Problema', 4,   'seed'),
  ('Entupimento de ralo ou esgoto',       'Hidráulica',            'Urgente', 'Problema', 6,   'seed'),
  ('Infiltração / goteira',               'Hidráulica',            'Média',   'Problema', 24,  'seed'),
  ('Queda de energia em área comum',      'Elétrica',              'Urgente', 'Problema', 2,   'seed'),
  ('Lâmpada queimada em área comum',      'Elétrica',              'Baixa',   'Demanda',  72,  'seed'),
  ('Portão da garagem com defeito',       'Portaria e Segurança',  'Urgente', 'Problema', 4,   'seed'),
  ('Interfone sem funcionar',             'Portaria e Segurança',  'Média',   'Problema', 24,  'seed'),
  ('Câmera de segurança fora do ar',      'Portaria e Segurança',  'Urgente', 'Problema', 8,   'seed'),
  ('Elevador parado',                     'Elevadores',            'Urgente', 'Problema', 2,   'seed'),
  ('Manutenção preventiva de elevador',   'Elevadores',            'Baixa',   'Demanda',  168, 'seed'),
  ('Limpeza de área comum',               'Limpeza',               'Baixa',   'Demanda',  48,  'seed'),
  ('Dedetização',                         'Limpeza',               'Baixa',   'Demanda',  168, 'seed'),
  ('Poda de jardim / áreas verdes',       'Jardinagem',            'Baixa',   'Demanda',  120, 'seed'),
  ('Manutenção da piscina',               'Lazer',                 'Média',   'Demanda',  48,  'seed'),
  ('Equipamento da academia quebrado',    'Lazer',                 'Média',   'Problema', 48,  'seed'),
  ('Barulho excessivo / perturbação',     'Convivência',           'Média',   'Problema', 24,  'seed'),
  ('Pintura de área comum',               'Manutenção Predial',    'Baixa',   'Demanda',  240, 'seed')
) AS v(nome, categoria, urgencia, tipo, sla_horas, criado_por)
WHERE NOT EXISTS (SELECT 1 FROM catalogo_servicos cs WHERE cs.nome = v.nome);

-- =========================================================================
-- 2) Fornecedores
-- =========================================================================

INSERT INTO fornecedores (nome_fantasia, cnpj, categoria_servico, nome_contato, email, telefone, cadastrado_por)
SELECT * FROM (VALUES
  ('Hidro Express Manutenção',       '01.234.567/0001-00', 'Hidráulica',           'Anakin Encanador','contato@hidroexpress.example','(11) 4002-8899', 'seed'),
  ('Elétrica Fiat Lux Manutenções',  '12.345.678/0001-01', 'Elétrica',             'Rex Antilles',    'contato@fiatlux.example',  '(11) 4002-8900', 'seed'),
  ('Portas & Portões Coruscant',     '23.456.789/0001-02', 'Portaria e Segurança', 'Bail Organa',     'contato@coruscant.example','(11) 4002-8901', 'seed'),
  ('Elevadores Skyrise Manutenção',  '34.567.890/0001-03', 'Elevadores',           'Lando Calrissian','contato@skyrise.example',  '(11) 4002-8902', 'seed'),
  ('Jardim Verde Vida',              '45.678.901/0001-04', 'Jardinagem',           'Qui-Gon Jardin',  'contato@verdevida.example','(11) 4002-8903', 'seed'),
  ('Limpa Tudo Serviços Gerais',     '56.789.012/0001-05', 'Limpeza',              'Shmi Skywalker',  'contato@limpatudo.example','(11) 4002-8904', 'seed')
) AS v(nome_fantasia, cnpj, categoria_servico, nome_contato, email, telefone, cadastrado_por)
WHERE NOT EXISTS (SELECT 1 FROM fornecedores f WHERE f.nome_fantasia = v.nome_fantasia);

-- =========================================================================
-- 3) Chamados — condôminos com nomes de Star Wars, status variados.
-- prazo_offset_horas negativo = prazo já passou (SLA vencido).
-- criado_offset_horas = quantas horas atrás o chamado foi aberto.
-- =========================================================================

INSERT INTO chamados (
  titulo, descricao, tipo_id, urgencia, status, prazo_sla, global,
  aberto_por_email, aberto_por_nome, aberto_por_unidade, fornecedor_id, criado_em
)
SELECT
  v.titulo, v.descricao, s.id, s.urgencia, v.status,
  now() + (v.prazo_offset_horas * interval '1 hour'),
  v.global, v.aberto_email, v.aberto_nome, v.aberto_unidade, f.id,
  now() - (v.criado_offset_horas * interval '1 hour')
FROM (VALUES
  ('Vazamento forte embaixo da pia',        'Água acumulando no chão da cozinha, já molhou o rodapé.',              'Vazamento hidráulico',             'Em andamento',       -36, false, 'luke.skywalker@tatooine.example',   'Luke Skywalker',   'Bloco 1, Apto 101', 'Hidro Express Manutenção', 72),
  ('Interfone não toca',                    'Interfone do apartamento não toca há 3 dias, só do porteiro.',          'Interfone sem funcionar',           'Novo',                20, false, 'leia.organa@alderaan.example',      'Leia Organa',      'Bloco 1, Apto 203', NULL,                        6),
  ('Portão da garagem não abre',            'Portão não responde ao controle, só no manual mesmo assim trava.',      'Portão da garagem com defeito',     'Aguardando fornecedor', -20, true,  'han.solo@corellia.example',         'Han Solo',         'Bloco 2, Apto 305', 'Portas & Portões Coruscant', 50),
  ('Energia caiu no corredor do 4º andar',  'Luzes do corredor do 4º andar apagaram ontem à noite.',                 'Queda de energia em área comum',    'Resolvido',            -80, true,  'chewbacca@kashyyyk.example',        'Chewbacca',        'Bloco 2, Apto 410', 'Elétrica Fiat Lux Manutenções', 96),
  ('Mancha de umidade no teto da sala',     'Mancha crescendo no teto, parece vir do apartamento de cima.',          'Infiltração / goteira',             'Em andamento',          18, false, 'obiwan.kenobi@stewjon.example',     'Obi-Wan Kenobi',   'Bloco 3, Cobertura', NULL,                        30),
  ('Elevador social parado',                'Elevador parou entre o 2º e 3º andar, luz de emergência acesa.',        'Elevador parado',                   'Paralisado',           -10, true,  'yoda@dagobah.example',              'Yoda',             'Bloco 1, Apto 102', 'Elevadores Skyrise Manutenção', 15),
  ('Hall de entrada sujo',                  'Lixo acumulado perto da portaria desde o fim de semana.',               'Limpeza de área comum',             'Novo',                 40, false, 'padme.amidala@naboo.example',       'Padmé Amidala',    'Bloco 2, Apto 201', NULL,                        4),
  ('Esteira da academia não liga',          'Esteira não liga mais, painel sem luz nenhuma.',                        'Equipamento da academia quebrado',  'Em andamento',          36, false, 'lando.calrissian@socorro.example',  'Lando Calrissian', 'Bloco 3, Apto 305', NULL,                        20),
  ('Festa com som alto de madrugada',       'Som alto depois da meia-noite no apartamento vizinho, de novo.',        'Barulho excessivo / perturbação',   'Reaberto',             -15, false, 'rey.skywalker@jakku.example',       'Rey Skywalker',    'Bloco 1, Apto 304', NULL,                        90),
  ('Câmera da garagem sem gravar',          'Câmera da garagem 2 está sem gravar desde terça-feira.',                'Câmera de segurança fora do ar',    'Aguardando fornecedor', -5,  true,  'finn.fn2187@jakku.example',         'Finn',             'Bloco 2, Apto 108', 'Portas & Portões Coruscant', 40),
  ('Água da piscina turva',                 'Piscina com água turva, parece que o filtro parou.',                    'Manutenção da piscina',             'Novo',                 44, false, 'poe.dameron@yavin.example',         'Poe Dameron',      'Bloco 3, Apto 220', NULL,                        3),
  ('Lâmpada do corredor queimada',          'Lâmpada do corredor do 5º andar, perto da escada, queimou.',            'Lâmpada queimada em área comum',    'Cancelado',             60, false, 'mace.windu@haruun-kal.example',     'Mace Windu',       'Bloco 1, Apto 405', NULL,                        100),
  ('Solicitação de dedetização trimestral', 'Pedido de rotina — dedetização trimestral das áreas comuns.',           'Dedetização',                       'Novo',                160, false, 'ahsoka.tano@shili.example',         'Ahsoka Tano',      'Bloco 2, Apto 112', NULL,                        2),
  ('Ralo do banheiro de serviço entupido',  'Ralo entupido, água não escoa, começando a feder.',                     'Entupimento de ralo ou esgoto',     'Em andamento',          -8, false, 'din.djarin@mandalore.example',      'Din Djarin',       'Bloco 3, Apto 115', 'Hidro Express Manutenção', 25)
) AS v(titulo, descricao, servico_nome, status, prazo_offset_horas, global, aberto_email, aberto_nome, aberto_unidade, fornecedor_nome, criado_offset_horas)
JOIN catalogo_servicos s ON s.nome = v.servico_nome
LEFT JOIN fornecedores f ON f.nome_fantasia = v.fornecedor_nome
WHERE NOT EXISTS (SELECT 1 FROM chamados c WHERE c.titulo = v.titulo);

-- =========================================================================
-- 4) Histórico — pelo menos a abertura de cada chamado, e uma movimentação
-- a mais pra quem já saiu do status "Novo".
-- =========================================================================

INSERT INTO chamados_historico (chamado_id, status_anterior, status_novo, justificativa, fornecedor_id, global, autor_email, autor_nome, criado_em)
SELECT c.id, v.status_anterior, v.status_novo, v.justificativa, f.id, v.global, v.autor_email, v.autor_nome,
       now() - (v.criado_offset_horas * interval '1 hour')
FROM (VALUES
  -- Vazamento forte embaixo da pia
  ('Vazamento forte embaixo da pia',        NULL,            'Novo',                 NULL,                                                                NULL,                        false, 'luke.skywalker@tatooine.example', 'Luke Skywalker',     72),
  ('Vazamento forte embaixo da pia',        'Novo',          'Em andamento',         'Fornecedor acionado, visita agendada.',                            'Hidro Express Manutenção', false, 'sindico@condominio.demo',         'Síndico (Admin)',   48),
  -- Portão da garagem não abre
  ('Portão da garagem não abre',            NULL,            'Novo',                 NULL,                                                                NULL,                        true,  'han.solo@corellia.example',       'Han Solo',           50),
  ('Portão da garagem não abre',            'Novo',          'Aguardando fornecedor','Peça do motor precisa ser trocada, fornecedor vai trazer amanhã.', 'Portas & Portões Coruscant', true,  'sindico@condominio.demo',         'Síndico (Admin)',   30),
  -- Energia caiu no corredor do 4º andar (resolvido)
  ('Energia caiu no corredor do 4º andar',  NULL,            'Novo',                 NULL,                                                                NULL,                        true,  'chewbacca@kashyyyk.example',      'Chewbacca',          96),
  ('Energia caiu no corredor do 4º andar',  'Novo',          'Em andamento',         'Eletricista a caminho.',                                           'Elétrica Fiat Lux Manutenções', true, 'sindico@condominio.demo',      'Síndico (Admin)',   90),
  ('Energia caiu no corredor do 4º andar',  'Em andamento',  'Resolvido',            'Disjuntor trocado, energia normalizada.',                          'Elétrica Fiat Lux Manutenções', true, 'sindico@condominio.demo',      'Síndico (Admin)',   85),
  -- Mancha de umidade no teto da sala
  ('Mancha de umidade no teto da sala',     NULL,            'Novo',                 NULL,                                                                NULL,                        false, 'obiwan.kenobi@stewjon.example',   'Obi-Wan Kenobi',     30),
  ('Mancha de umidade no teto da sala',     'Novo',          'Em andamento',         'Síndico foi verificar a origem com o condômino do andar de cima.', NULL,                       false, 'sindico@condominio.demo',         'Síndico (Admin)',   22),
  -- Elevador social parado
  ('Elevador social parado',                NULL,            'Novo',                 NULL,                                                                NULL,                        true,  'yoda@dagobah.example',            'Yoda',               15),
  ('Elevador social parado',                'Novo',          'Paralisado',           'Aguardando peça de reposição — fornecedor sem previsão exata.',   'Elevadores Skyrise Manutenção', true, 'sindico@condominio.demo',      'Síndico (Admin)',   10),
  -- Esteira da academia não liga
  ('Esteira da academia não liga',          NULL,            'Novo',                 NULL,                                                                NULL,                        false, 'lando.calrissian@socorro.example','Lando Calrissian',   20),
  ('Esteira da academia não liga',          'Novo',          'Em andamento',         'Técnico avaliará se é problema elétrico ou da placa do equipamento.', NULL,                     false, 'sindico@condominio.demo',      'Síndico (Admin)',   12),
  -- Festa com som alto de madrugada (reaberto)
  ('Festa com som alto de madrugada',       NULL,            'Novo',                 NULL,                                                                NULL,                        false, 'rey.skywalker@jakku.example',     'Rey Skywalker',      90),
  ('Festa com som alto de madrugada',       'Novo',          'Resolvido',            'Conversamos com o morador, ele se comprometeu a reduzir o volume.', NULL,                       false, 'sindico@condominio.demo',         'Síndico (Admin)',   60),
  ('Festa com som alto de madrugada',       'Resolvido',     'Reaberto',             'Reincidência — som alto de novo no mesmo apartamento.',            NULL,                        false, 'rey.skywalker@jakku.example',     'Rey Skywalker',      16),
  -- Câmera da garagem sem gravar
  ('Câmera da garagem sem gravar',          NULL,            'Novo',                 NULL,                                                                NULL,                        true,  'finn.fn2187@jakku.example',       'Finn',               40),
  ('Câmera da garagem sem gravar',          'Novo',          'Aguardando fornecedor','Técnico identificou problema no cabeamento, aguardando peça.',    'Portas & Portões Coruscant', true,  'sindico@condominio.demo',         'Síndico (Admin)',   18),
  -- Lâmpada do corredor queimada (cancelado)
  ('Lâmpada do corredor queimada',          NULL,            'Novo',                 NULL,                                                                NULL,                        false, 'mace.windu@haruun-kal.example',   'Mace Windu',         100),
  ('Lâmpada do corredor queimada',          'Novo',          'Cancelado',            'Zelador já havia trocado a lâmpada antes do chamado ser aberto.', NULL,                        false, 'sindico@condominio.demo',         'Síndico (Admin)',   95),
  -- Ralo do banheiro de serviço entupido
  ('Ralo do banheiro de serviço entupido',  NULL,            'Novo',                 NULL,                                                                NULL,                        false, 'din.djarin@mandalore.example',    'Din Djarin',         25),
  ('Ralo do banheiro de serviço entupido',  'Novo',          'Em andamento',         'Fornecedor de hidráulica acionado, aguardando confirmação de data.', 'Hidro Express Manutenção', false, 'sindico@condominio.demo',      'Síndico (Admin)',   18)
) AS v(titulo, status_anterior, status_novo, justificativa, fornecedor_nome, global, autor_email, autor_nome, criado_offset_horas)
JOIN chamados c ON c.titulo = v.titulo
LEFT JOIN fornecedores f ON f.nome_fantasia = v.fornecedor_nome
WHERE NOT EXISTS (
  SELECT 1 FROM chamados_historico h
  WHERE h.chamado_id = c.id
    AND h.status_novo = v.status_novo
    AND coalesce(h.status_anterior, '') = coalesce(v.status_anterior, '')
);
