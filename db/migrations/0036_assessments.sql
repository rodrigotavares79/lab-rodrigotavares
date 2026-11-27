-- B28 · Assessments de segurança sob demanda (ambiente, projeto ou área).
--
-- - assessment_perguntas: banco de perguntas versionável. Pergunta não se
--   apaga: desativa-se (ativa = false) para não alterar assessments antigos.
--   tipo 'objetiva' (Sim / Não / Parcial / N/A) ou 'descritiva' (texto).
-- - assessments: o trabalho em si (codigo ASM-001...), ligado a um projeto,
--   com as áreas aplicáveis escolhidas na criação. Fluxo de status:
--   Rascunho -> Em revisão -> Concluído (ou devolvido a Rascunho com motivo).
--   snapshot guarda a foto do relatório na conclusão (riscos como estavam).
-- - assessment_respostas: uma linha por pergunta respondida.
-- - assessment_riscos: riscos registrados a partir de uma pergunta. O risco
--   continua no cadastro normal; aqui fica só o vínculo de origem.
-- - fn_log_alteracoes (0017 em diante) registra autor e alterações das três
--   tabelas de trabalho; nenhuma delas tem risco_id próprio na linha do
--   tempo do risco, exceto o vínculo.
--
-- Regras de negócio: lib/assessmentRegras.ts (testes em
-- tests/assessmentRegras.test.mts). Permissões: docs/matriz-permissoes.md.

BEGIN;

CREATE TABLE IF NOT EXISTS assessment_perguntas (
  id serial PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  area text NOT NULL,
  area_ordem integer NOT NULL,
  ordem integer NOT NULL,
  texto text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('objetiva', 'descritiva')),
  ativa boolean NOT NULL DEFAULT true,
  criada_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assessment_perguntas_area ON assessment_perguntas (area_ordem, ordem);

CREATE TABLE IF NOT EXISTS assessments (
  id serial PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  titulo text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('Ambiente', 'Projeto', 'Área de negócio')),
  projeto_id integer NOT NULL REFERENCES projetos(id),
  escopo text NOT NULL,
  objetivo text,
  areas text[] NOT NULL CHECK (cardinality(areas) > 0),
  status text NOT NULL DEFAULT 'Rascunho' CHECK (status IN ('Rascunho', 'Em revisão', 'Concluído')),
  analista_email text NOT NULL,
  analista_nome text,
  data_inicio date,
  enviado_revisao_em timestamptz,
  revisor_email text,
  revisor_nome text,
  devolvido_motivo text,
  concluido_em timestamptz,
  snapshot jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'Concluído' OR (concluido_em IS NOT NULL AND revisor_email IS NOT NULL AND snapshot IS NOT NULL)),
  -- Segregação de funções: quem conduz não aprova o próprio assessment.
  CHECK (revisor_email IS NULL OR lower(revisor_email) <> lower(analista_email))
);
CREATE INDEX IF NOT EXISTS idx_assessments_projeto ON assessments (projeto_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments (status);

CREATE TABLE IF NOT EXISTS assessment_respostas (
  id serial PRIMARY KEY,
  assessment_id integer NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  pergunta_id integer NOT NULL REFERENCES assessment_perguntas(id),
  resposta text CHECK (resposta IN ('Sim', 'Não', 'Parcial', 'N/A')),
  descritivo text,
  evidencia text,
  entrevistados text,
  respondido_por_email text,
  respondido_por_nome text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, pergunta_id)
);

CREATE TABLE IF NOT EXISTS assessment_riscos (
  id serial PRIMARY KEY,
  assessment_id integer NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  pergunta_id integer NOT NULL REFERENCES assessment_perguntas(id),
  risco_id integer NOT NULL REFERENCES riscos(id) ON DELETE CASCADE,
  vinculado_por_email text,
  vinculado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, pergunta_id, risco_id)
);
CREATE INDEX IF NOT EXISTS idx_assessment_riscos_risco ON assessment_riscos (risco_id);

DROP TRIGGER IF EXISTS trg_log_alteracoes ON assessments;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON assessments
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();
DROP TRIGGER IF EXISTS trg_log_alteracoes ON assessment_respostas;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON assessment_respostas
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();
DROP TRIGGER IF EXISTS trg_log_alteracoes ON assessment_riscos;
CREATE TRIGGER trg_log_alteracoes AFTER INSERT OR UPDATE OR DELETE ON assessment_riscos
  FOR EACH ROW EXECUTE FUNCTION fn_log_alteracoes();

-- Banco de perguntas inicial: 17 áreas, 145 perguntas (stack de
-- cibersegurança v3.3). Reexecutar não duplica nem sobrescreve edições.
INSERT INTO assessment_perguntas (codigo, area, area_ordem, ordem, texto, tipo) VALUES
  ('01.01', 'Programa e escopo do time', 1, 1, 'Existe um programa de segurança formalizado, com estratégia, roadmap e orçamento aprovados pela alta direção?', 'objetiva'),
  ('01.02', 'Programa e escopo do time', 1, 2, 'Existe matriz RACI definindo as responsabilidades de segurança entre SI, TI, Jurídico, Riscos e terceiros?', 'objetiva'),
  ('01.03', 'Programa e escopo do time', 1, 3, 'Quais frentes estão sob responsabilidade direta do time de SI e quais estão com outras áreas ou terceiros?', 'descritiva'),
  ('01.04', 'Programa e escopo do time', 1, 4, 'Qual o tamanho do time, quais competências estão disponíveis e quais lacunas são cobertas por serviços gerenciados?', 'descritiva'),
  ('01.05', 'Programa e escopo do time', 1, 5, 'Qual framework de referência orienta o programa (ISO 27001, NIST CSF, CIS Controls)?', 'descritiva'),
  ('01.06', 'Programa e escopo do time', 1, 6, 'É realizada avaliação de maturidade periódica?', 'objetiva'),
  ('01.07', 'Programa e escopo do time', 1, 7, 'Como segurança e prevenção a fraudes se relacionam? Quem detecta, investiga e responde a fraudes?', 'descritiva'),
  ('01.08', 'Programa e escopo do time', 1, 8, 'Existe um mapa de ameaças (threat map) específico para o setor e o negócio da companhia?', 'objetiva'),
  ('02.01', 'Governança corporativa', 2, 1, 'Existem comitês estratégico, tático e operacional de segurança formalmente instituídos?', 'objetiva'),
  ('02.02', 'Governança corporativa', 2, 2, 'Quem participa de cada comitê, com que periodicidade se reúnem e onde ficam registradas as atas?', 'descritiva'),
  ('02.03', 'Governança corporativa', 2, 3, 'O conselho ou a diretoria recebe reporte periódico sobre risco cibernético?', 'objetiva'),
  ('02.04', 'Governança corporativa', 2, 4, 'A quem o CISO ou gestor de SI se reporta? Essa linha preserva independência em relação à TI?', 'descritiva'),
  ('02.05', 'Governança corporativa', 2, 5, 'As decisões dos comitês são registradas como ações com responsável e prazo, com acompanhamento formal?', 'objetiva'),
  ('02.06', 'Governança corporativa', 2, 6, 'Quais KPIs e KRIs de segurança são reportados e quem define as metas?', 'descritiva'),
  ('03.01', 'Gestão de riscos', 3, 1, 'Existe um processo de ERM corporativo?', 'objetiva'),
  ('03.02', 'Gestão de riscos', 3, 2, 'Os riscos cibernéticos estão integrados ao ERM?', 'objetiva'),
  ('03.03', 'Gestão de riscos', 3, 3, 'Qual metodologia de avaliação de risco é usada (qualitativa, quantitativa, FAIR) e onde estão documentados os critérios?', 'descritiva'),
  ('03.04', 'Gestão de riscos', 3, 4, 'O apetite e a tolerância a risco foram definidos e aprovados pela alta direção?', 'objetiva'),
  ('03.05', 'Gestão de riscos', 3, 5, 'Foi realizada uma BIA nos últimos 12 meses?', 'objetiva'),
  ('03.06', 'Gestão de riscos', 3, 6, 'Quais processos foram classificados como críticos na BIA e quais são os RTO/RPO definidos?', 'descritiva'),
  ('03.07', 'Gestão de riscos', 3, 7, 'As joias da coroa (ativos e dados mais críticos) estão identificadas e têm controles diferenciados?', 'objetiva'),
  ('03.08', 'Gestão de riscos', 3, 8, 'Quem aprova a aceitação de um risco e por quanto tempo essa aceitação vale?', 'descritiva'),
  ('03.09', 'Gestão de riscos', 3, 9, 'Os planos de tratamento de risco têm responsável, prazo e acompanhamento?', 'objetiva'),
  ('03.10', 'Gestão de riscos', 3, 10, 'Qual o percentual atual de planos de tratamento vencidos?', 'descritiva'),
  ('04.01', 'Avaliação de terceiros', 4, 1, 'Existe inventário de fornecedores classificados por criticidade e por acesso a dados ou sistemas?', 'objetiva'),
  ('04.02', 'Avaliação de terceiros', 4, 2, 'Há due diligence de segurança antes da contratação, com questionário (SAQ) padronizado?', 'objetiva'),
  ('04.03', 'Avaliação de terceiros', 4, 3, 'Os contratos têm cláusulas de segurança, privacidade, direito de auditoria e notificação de incidentes?', 'objetiva'),
  ('04.04', 'Avaliação de terceiros', 4, 4, 'Os fornecedores críticos são reavaliados periodicamente?', 'objetiva'),
  ('04.05', 'Avaliação de terceiros', 4, 5, 'É utilizado serviço externo de rating de segurança (security score)?', 'objetiva'),
  ('04.06', 'Avaliação de terceiros', 4, 6, 'Existe workflow que integre Compras, Jurídico e SI na contratação?', 'objetiva'),
  ('04.07', 'Avaliação de terceiros', 4, 7, 'Como é feito o offboarding do fornecedor (revogação de acessos, devolução ou descarte de dados)?', 'descritiva'),
  ('05.01', 'Conscientização', 5, 1, 'Existe programa anual de conscientização com público-alvo, temas e calendário definidos?', 'objetiva'),
  ('05.02', 'Conscientização', 5, 2, 'O treinamento é obrigatório na admissão e periódico?', 'objetiva'),
  ('05.03', 'Conscientização', 5, 3, 'Qual a taxa de conclusão dos treinamentos no último ciclo?', 'descritiva'),
  ('05.04', 'Conscientização', 5, 4, 'Há trilhas específicas para públicos de maior risco (executivos, financeiro, TI, desenvolvedores)?', 'objetiva'),
  ('05.05', 'Conscientização', 5, 5, 'São realizadas campanhas de phishing simulado?', 'objetiva'),
  ('05.06', 'Conscientização', 5, 6, 'Quais as taxas de clique e de reporte nas simulações e como evoluíram?', 'descritiva'),
  ('05.07', 'Conscientização', 5, 7, 'O que acontece com quem falha repetidamente nas simulações?', 'descritiva'),
  ('05.08', 'Conscientização', 5, 8, 'Como a efetividade do programa é medida além da conclusão de cursos?', 'descritiva'),
  ('06.01', 'Gestão de crises e continuidade', 6, 1, 'Existe Plano de Gestão de Crises (PGC) aprovado e revisado nos últimos 12 meses?', 'objetiva'),
  ('06.02', 'Gestão de crises e continuidade', 6, 2, 'Existe Plano de Resposta a Incidentes (PRI) aprovado e revisado nos últimos 12 meses?', 'objetiva'),
  ('06.03', 'Gestão de crises e continuidade', 6, 3, 'O comitê de crise está definido, com papéis, substitutos e canais alternativos de comunicação?', 'objetiva'),
  ('06.04', 'Gestão de crises e continuidade', 6, 4, 'Foram realizados exercícios de mesa (TTX) com a alta direção nos últimos 12 meses?', 'objetiva'),
  ('06.05', 'Gestão de crises e continuidade', 6, 5, 'Quais lições aprendidas surgiram do último TTX e como foram tratadas?', 'descritiva'),
  ('06.06', 'Gestão de crises e continuidade', 6, 6, 'Existe contrato de retainer com empresa de resposta a incidentes?', 'objetiva'),
  ('06.07', 'Gestão de crises e continuidade', 6, 7, 'Existe seguro cyber contratado?', 'objetiva'),
  ('06.08', 'Gestão de crises e continuidade', 6, 8, 'Quais coberturas, exclusões e exigências de controle a apólice de seguro cyber impõe?', 'descritiva'),
  ('06.09', 'Gestão de crises e continuidade', 6, 9, 'O plano de comunicação prevê reguladores (ANPD), clientes, imprensa e colaboradores?', 'objetiva'),
  ('07.01', 'Privacidade de dados', 7, 1, 'Existe encarregado (DPO) nomeado e com recursos?', 'objetiva'),
  ('07.02', 'Privacidade de dados', 7, 2, 'O inventário de tratamento de dados pessoais (data mapping) está atualizado e cobre as bases legais?', 'objetiva'),
  ('07.03', 'Privacidade de dados', 7, 3, 'Existe ferramenta ou processo de data discovery para encontrar dados pessoais não mapeados?', 'objetiva'),
  ('07.04', 'Privacidade de dados', 7, 4, 'Como são atendidas as solicitações de titulares e qual o prazo médio de resposta?', 'descritiva'),
  ('07.05', 'Privacidade de dados', 7, 5, 'Privacy by design está incorporado ao ciclo de projetos, com RIPD para tratamentos de alto risco?', 'objetiva'),
  ('07.06', 'Privacidade de dados', 7, 6, 'Qual o processo para avaliar e comunicar incidentes com dados pessoais à ANPD e aos titulares?', 'descritiva'),
  ('08.01', 'Políticas e normas', 8, 1, 'Existe PSI aprovada pela alta direção e revisada nos últimos 24 meses?', 'objetiva'),
  ('08.02', 'Políticas e normas', 8, 2, 'As normas derivadas cobrem acesso, uso aceitável, classificação, backup e incidentes?', 'objetiva'),
  ('08.03', 'Políticas e normas', 8, 3, 'Como as políticas são divulgadas e como se obtém o aceite dos colaboradores?', 'descritiva'),
  ('08.04', 'Políticas e normas', 8, 4, 'Existe processo formal de exceção à política, com registro, aprovação e prazo de validade?', 'objetiva'),
  ('08.05', 'Políticas e normas', 8, 5, 'Como se verifica que as políticas estão sendo cumpridas na prática?', 'descritiva'),
  ('09.01', 'Segurança de aplicação', 9, 1, 'Existe ciclo de desenvolvimento seguro (SSDLC) documentado?', 'objetiva'),
  ('09.02', 'Segurança de aplicação', 9, 2, 'O SSDLC também se aplica a fábricas de software terceirizadas?', 'objetiva'),
  ('09.03', 'Segurança de aplicação', 9, 3, 'Quais testes são realizados (SAST, DAST, IAST, SCA) e em que ponto do pipeline?', 'descritiva'),
  ('09.04', 'Segurança de aplicação', 9, 4, 'Existem gates no pipeline que impedem deploy com vulnerabilidades críticas?', 'objetiva'),
  ('09.05', 'Segurança de aplicação', 9, 5, 'Há code review com foco em segurança?', 'objetiva'),
  ('09.06', 'Segurança de aplicação', 9, 6, 'Existe programa de security champions nos times de desenvolvimento?', 'objetiva'),
  ('09.07', 'Segurança de aplicação', 9, 7, 'Threat modeling é feito em novos sistemas ou mudanças relevantes?', 'objetiva'),
  ('09.08', 'Segurança de aplicação', 9, 8, 'Segredos, chaves e tokens são armazenados em cofre (key vault), com varredura de segredos no código?', 'objetiva'),
  ('09.09', 'Segurança de aplicação', 9, 9, 'As APIs estão inventariadas e têm autenticação, autorização e limitação de requisições?', 'objetiva'),
  ('09.10', 'Segurança de aplicação', 9, 10, 'Aplicações móveis ou críticas usam proteção em execução (RASP, ofuscação, shielding)?', 'objetiva'),
  ('09.11', 'Segurança de aplicação', 9, 11, 'Qual o SLA de correção de vulnerabilidades em aplicações, por criticidade, e qual o backlog atual?', 'descritiva'),
  ('10.01', 'Gestão de acessos e identidades', 10, 1, 'Existe fonte autoritativa de identidades (RH) integrada ao provisionamento e desprovisionamento?', 'objetiva'),
  ('10.02', 'Gestão de acessos e identidades', 10, 2, 'Em quanto tempo um acesso é revogado após um desligamento? (validar por amostragem)', 'descritiva'),
  ('10.03', 'Gestão de acessos e identidades', 10, 3, 'Há revisão periódica de acessos pelos gestores?', 'objetiva'),
  ('10.04', 'Gestão de acessos e identidades', 10, 4, 'Com que frequência ocorrem as revisões de acesso e qual a taxa de conclusão?', 'descritiva'),
  ('10.05', 'Gestão de acessos e identidades', 10, 5, 'A matriz de segregação de funções (SoD) está definida para sistemas críticos, com monitoramento de conflitos?', 'objetiva'),
  ('10.06', 'Gestão de acessos e identidades', 10, 6, 'MFA está habilitado para acesso remoto, e-mail, nuvem e contas privilegiadas?', 'objetiva'),
  ('10.07', 'Gestão de acessos e identidades', 10, 7, 'Qual a cobertura atual de MFA (% de usuários e sistemas)?', 'descritiva'),
  ('10.08', 'Gestão de acessos e identidades', 10, 8, 'Contas privilegiadas são gerenciadas em PAM, com cofre de senhas e gravação de sessão?', 'objetiva'),
  ('10.09', 'Gestão de acessos e identidades', 10, 9, 'Contas de serviço e identidades de máquina (IDoT) estão inventariadas e têm dono?', 'objetiva'),
  ('10.10', 'Gestão de acessos e identidades', 10, 10, 'Para clientes (B2C), existe CIAM com proteção contra fraude de conta e credential stuffing?', 'objetiva'),
  ('10.11', 'Gestão de acessos e identidades', 10, 11, 'Existe detecção de comprometimento de identidade e regras de acesso adaptativo por risco?', 'objetiva'),
  ('11.01', 'Internet e perímetro', 11, 1, 'Existe inventário dos ativos expostos à internet, com aprovação formal para nova exposição?', 'objetiva'),
  ('11.02', 'Internet e perímetro', 11, 2, 'As regras de firewall de borda são revisadas periodicamente?', 'objetiva'),
  ('11.03', 'Internet e perímetro', 11, 3, 'Aplicações web expostas estão atrás de WAF em modo de bloqueio?', 'objetiva'),
  ('11.04', 'Internet e perímetro', 11, 4, 'Há proteção contra DoS e gestão de bots?', 'objetiva'),
  ('11.05', 'Internet e perímetro', 11, 5, 'Como é feito o acesso remoto (VPN, ZTNA) e como o acesso de terceiros é segregado e expirado?', 'descritiva'),
  ('11.06', 'Internet e perímetro', 11, 6, 'O e-mail tem proteção contra phishing e malware, com SPF, DKIM e DMARC em política de rejeição?', 'objetiva'),
  ('11.07', 'Internet e perímetro', 11, 7, 'A navegação é filtrada (web gateway, DNS protection)?', 'objetiva'),
  ('11.08', 'Internet e perímetro', 11, 8, 'O uso de SaaS não autorizado é controlado (CASB)?', 'objetiva'),
  ('11.09', 'Internet e perímetro', 11, 9, 'Existe IDS/IPS, sandbox para anexos e análise de tráfego (NTA) com alertas encaminhados ao SOC?', 'objetiva'),
  ('11.10', 'Internet e perímetro', 11, 10, 'O acesso administrativo passa por jump box ou bastion com registro de sessão?', 'objetiva'),
  ('12.01', 'Segurança ofensiva', 12, 1, 'São realizados pentests interno e externo ao menos uma vez por ano?', 'objetiva'),
  ('12.02', 'Segurança ofensiva', 12, 2, 'Quem define o escopo dos testes e com que frequência são feitos?', 'descritiva'),
  ('12.03', 'Segurança ofensiva', 12, 3, 'Os testes são executados por equipe independente, com rodízio de fornecedores?', 'objetiva'),
  ('12.04', 'Segurança ofensiva', 12, 4, 'Os achados viram planos de ação com prazo e reteste para confirmar a correção?', 'objetiva'),
  ('12.05', 'Segurança ofensiva', 12, 5, 'Já foi realizado exercício de red team ou purple team?', 'objetiva'),
  ('12.06', 'Segurança ofensiva', 12, 6, 'Existe autorização formal antes de qualquer teste ofensivo?', 'objetiva'),
  ('13.01', 'Endpoint gerenciado', 13, 1, 'Qual o percentual de estações com EDR ativo e reportando?', 'descritiva'),
  ('13.02', 'Endpoint gerenciado', 13, 2, 'Existe inventário de ativos (ITAM) reconciliado com o EDR e o diretório?', 'objetiva'),
  ('13.03', 'Endpoint gerenciado', 13, 3, 'Qual o SLA de patches em estações e a conformidade atual?', 'descritiva'),
  ('13.04', 'Endpoint gerenciado', 13, 4, 'Existe baseline de hardening com validação automática de desvios?', 'objetiva'),
  ('13.05', 'Endpoint gerenciado', 13, 5, 'Os discos das estações são criptografados?', 'objetiva'),
  ('13.06', 'Endpoint gerenciado', 13, 6, 'O privilégio administrativo local foi removido dos usuários?', 'objetiva'),
  ('13.07', 'Endpoint gerenciado', 13, 7, 'Há controle de aplicações (allowlist) e bloqueio de mídias removíveis?', 'objetiva'),
  ('13.08', 'Endpoint gerenciado', 13, 8, 'Dispositivos móveis com dados corporativos são gerenciados (MDM/MAM), com apagamento remoto?', 'objetiva'),
  ('13.09', 'Endpoint gerenciado', 13, 9, 'Existe classificação da informação aplicada e DLP em e-mail, web e USB?', 'objetiva'),
  ('13.10', 'Endpoint gerenciado', 13, 10, 'Existe NAC impedindo a conexão de dispositivos não autorizados?', 'objetiva'),
  ('13.11', 'Endpoint gerenciado', 13, 11, 'Arquivos críticos têm monitoramento de integridade (FIM)?', 'objetiva'),
  ('13.12', 'Endpoint gerenciado', 13, 12, 'Existe análise de comportamento de usuários (UEBA)?', 'objetiva'),
  ('14.01', 'Proteção da infraestrutura', 14, 1, 'Os backups seguem a regra 3-2-1, com cópia imutável ou offline?', 'objetiva'),
  ('14.02', 'Proteção da infraestrutura', 14, 2, 'Quando foi o último teste de restauração completo e qual o resultado?', 'descritiva'),
  ('14.03', 'Proteção da infraestrutura', 14, 3, 'Existe site secundário e plano de DR testado nos últimos 12 meses?', 'objetiva'),
  ('14.04', 'Proteção da infraestrutura', 14, 4, 'RTO e RPO foram atingidos no último teste de DR?', 'descritiva'),
  ('14.05', 'Proteção da infraestrutura', 14, 5, 'Qual o SLA de patches em servidores e a conformidade atual?', 'descritiva'),
  ('14.06', 'Proteção da infraestrutura', 14, 6, 'Há virtual patching para sistemas legados que não podem ser atualizados?', 'objetiva'),
  ('14.07', 'Proteção da infraestrutura', 14, 7, 'Servidores têm EDR, HIPS e baseline de hardening validado?', 'objetiva'),
  ('14.08', 'Proteção da infraestrutura', 14, 8, 'A rede é segmentada por criticidade?', 'objetiva'),
  ('14.09', 'Proteção da infraestrutura', 14, 9, 'Ambientes críticos têm microssegmentação e monitoramento do tráfego leste-oeste?', 'objetiva'),
  ('14.10', 'Proteção da infraestrutura', 14, 10, 'Dados sensíveis são criptografados em repouso e em trânsito?', 'objetiva'),
  ('14.11', 'Proteção da infraestrutura', 14, 11, 'Quem gerencia as chaves de criptografia e como?', 'descritiva'),
  ('14.12', 'Proteção da infraestrutura', 14, 12, 'Bancos de dados têm monitoramento de atividade (DAM/DBF) e mascaramento em ambientes não produtivos?', 'objetiva'),
  ('14.13', 'Proteção da infraestrutura', 14, 13, 'Na nuvem, há controle de postura (CSPM), de permissões (CIEM) e de cargas de trabalho (CWPP)?', 'objetiva'),
  ('14.14', 'Proteção da infraestrutura', 14, 14, 'Imagens de contêiner são verificadas antes do deploy e há proteção em execução?', 'objetiva'),
  ('14.15', 'Proteção da infraestrutura', 14, 15, 'Existe CMDB atualizada, com dono e criticidade por ativo?', 'objetiva'),
  ('14.16', 'Proteção da infraestrutura', 14, 16, 'O acesso físico ao datacenter é controlado e registrado?', 'objetiva'),
  ('15.01', 'Monitoramento e incidentes', 15, 1, 'Existe SOC em operação 24x7?', 'objetiva'),
  ('15.02', 'Monitoramento e incidentes', 15, 2, 'O SOC é interno, terceirizado ou híbrido? Como estão estruturados os níveis N1, N2 e N3?', 'descritiva'),
  ('15.03', 'Monitoramento e incidentes', 15, 3, 'Quais fontes de log alimentam o SIEM, qual a cobertura sobre ativos críticos e qual o tempo de retenção?', 'descritiva'),
  ('15.04', 'Monitoramento e incidentes', 15, 4, 'Os casos de uso de detecção estão documentados e mapeados ao MITRE ATT&CK?', 'objetiva'),
  ('15.05', 'Monitoramento e incidentes', 15, 5, 'Quais os tempos médios de detecção (MTTD) e de resposta (MTTR)?', 'descritiva'),
  ('15.06', 'Monitoramento e incidentes', 15, 6, 'Existem playbooks e runbooks para os cenários mais prováveis (ransomware, vazamento, conta comprometida)?', 'objetiva'),
  ('15.07', 'Monitoramento e incidentes', 15, 7, 'Há automação de resposta (SOAR) e enriquecimento de alertas?', 'objetiva'),
  ('15.08', 'Monitoramento e incidentes', 15, 8, 'A gestão de vulnerabilidades cobre todos os ativos e prioriza por criticidade e exploração ativa?', 'objetiva'),
  ('15.09', 'Monitoramento e incidentes', 15, 9, 'Existe threat hunting proativo?', 'objetiva'),
  ('15.10', 'Monitoramento e incidentes', 15, 10, 'Existe capacidade de análise forense com cadeia de custódia?', 'objetiva'),
  ('15.11', 'Monitoramento e incidentes', 15, 11, 'Os controles de detecção são validados por simulação de ataques (BAS)?', 'objetiva'),
  ('15.12', 'Monitoramento e incidentes', 15, 12, 'Após incidentes, é feita análise de causa raiz com lições aprendidas registradas?', 'objetiva'),
  ('16.01', 'Threat intelligence', 16, 1, 'Quais fontes de inteligência de ameaças são consumidas e qual sua relevância para o setor?', 'descritiva'),
  ('16.02', 'Threat intelligence', 16, 2, 'Há monitoramento de marca, domínios, executivos e credenciais vazadas, inclusive em deep e dark web?', 'objetiva'),
  ('16.03', 'Threat intelligence', 16, 3, 'Existe processo de takedown de sites e perfis fraudulentos?', 'objetiva'),
  ('16.04', 'Threat intelligence', 16, 4, 'Os indicadores de ameaça são integrados de forma automatizada ao SIEM, EDR e firewall?', 'objetiva'),
  ('16.05', 'Threat intelligence', 16, 5, 'A companhia compartilha informações com o setor (ISACs, MISP)?', 'objetiva'),
  ('17.01', 'Dados de segurança', 17, 1, 'Os dados de diferentes ferramentas de segurança são consolidados em um repositório único (security data lake)?', 'objetiva'),
  ('17.02', 'Dados de segurança', 17, 2, 'Esses dados geram indicadores para a gestão ou servem apenas à operação?', 'descritiva'),
  ('17.03', 'Dados de segurança', 17, 3, 'Quem é o dono desses dados e quais regras de acesso, retenção e privacidade se aplicam?', 'descritiva')
ON CONFLICT (codigo) DO NOTHING;

COMMIT;
