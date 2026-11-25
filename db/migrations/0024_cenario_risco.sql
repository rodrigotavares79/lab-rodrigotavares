-- B13 · Cenário de risco estruturado (causa → evento → consequência).
--
-- - riscos.causa, riscos.evento, riscos.consequencia: o cenário.
-- - riscos.titulo: "Risco de [evento] em razão de [causa], resultando em
--   [consequência]", mantido pelo banco (trigger) em qualquer caminho de
--   gravação; NULL enquanto o cenário estiver incompleto. A mesma regra está
--   em lib/cenarioRisco.ts.
-- - gatilho continua existindo, mas deixa de ser o nome do risco: é o ponto
--   de gatilho (sinal observável, base dos KRIs).
-- - resultado_potencial vira "Detalhamento do impacto" (opcional).
-- - Os 58 riscos existentes recebem causa/evento/consequência redigidos a
--   partir do gatilho e do resultado potencial (decisão do dono do sistema:
--   gravar direto). Ficam no log de alterações como alteração "banco".

BEGIN;

ALTER TABLE riscos ADD COLUMN IF NOT EXISTS causa text;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS evento text;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS consequencia text;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS titulo text;

CREATE OR REPLACE FUNCTION fn_trecho_titulo(texto text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  t text := regexp_replace(btrim(COALESCE(texto, '')), '\s+', ' ', 'g');
  p text;
  s text;
BEGIN
  t := regexp_replace(t, '[.;[:space:]]+$', '');
  IF length(t) >= 2 THEN
    p := substr(t, 1, 1);
    s := substr(t, 2, 1);
    IF p <> lower(p) AND p = upper(p) AND s = lower(s) THEN
      t := lower(p) || substr(t, 2);
    END IF;
  END IF;
  RETURN t;
END;
$$;

CREATE OR REPLACE FUNCTION fn_titulo_risco() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF fn_trecho_titulo(NEW.causa) = '' OR fn_trecho_titulo(NEW.evento) = '' OR fn_trecho_titulo(NEW.consequencia) = '' THEN
    NEW.titulo := NULL;
  ELSE
    NEW.titulo := 'Risco de ' || fn_trecho_titulo(NEW.evento)
      || ' em razão de ' || fn_trecho_titulo(NEW.causa)
      || ', resultando em ' || fn_trecho_titulo(NEW.consequencia);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_titulo_risco ON riscos;
CREATE TRIGGER trg_titulo_risco BEFORE INSERT OR UPDATE ON riscos
  FOR EACH ROW EXECUTE FUNCTION fn_titulo_risco();

-- Log de alterações: riscos.titulo é derivado (sai do log; as mudanças já
-- aparecem em causa/evento/consequencia). Só em riscos: planos_acao também
-- tem "titulo", e esse continua no log.
CREATE OR REPLACE FUNCTION fn_log_alteracoes() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_id text;
  v_risco integer;
  v_plano text;
  v_email text := NULLIF(current_setting('app.usuario_email', true), '');
  v_nome text := NULLIF(current_setting('app.usuario_nome', true), '');
  v_origem text;
  k text;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD) - 'arquivo_url' - 'carta_url'; END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW) - 'arquivo_url' - 'carta_url'; END IF;
  IF TG_TABLE_NAME = 'riscos' THEN
    v_old := v_old - 'titulo';
    v_new := v_new - 'titulo';
  END IF;
  v_id := COALESCE(v_new->>'id', v_old->>'id');

  IF TG_TABLE_NAME = 'riscos' THEN
    v_risco := v_id::integer;
  ELSIF TG_TABLE_NAME IN ('fatores_risco', 'planos_acao', 'aceitacoes_risco') THEN
    v_risco := COALESCE(v_new->>'risco_id', v_old->>'risco_id')::integer;
  ELSE
    v_plano := COALESCE(v_new->>'plano_acao_id', v_old->>'plano_acao_id');
    IF v_plano IS NOT NULL THEN
      SELECT risco_id INTO v_risco FROM planos_acao WHERE id = v_plano::integer;
    END IF;
  END IF;

  IF v_email IS NULL THEN
    v_email := 'banco: ' || session_user;
    v_origem := 'banco';
  ELSE
    v_origem := 'aplicacao';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    FOR k IN SELECT key FROM jsonb_each(v_new) LOOP
      IF (v_new -> k) IS DISTINCT FROM (v_old -> k) THEN
        INSERT INTO log_alteracoes (tabela, registro_id, risco_id, operacao, campo, valor_anterior, valor_novo, usuario_email, usuario_nome, origem)
        VALUES (TG_TABLE_NAME, v_id, v_risco, TG_OP, k, v_old -> k, v_new -> k, v_email, v_nome, v_origem);
      END IF;
    END LOOP;
  ELSE
    INSERT INTO log_alteracoes (tabela, registro_id, risco_id, operacao, campo, valor_anterior, valor_novo, usuario_email, usuario_nome, origem)
    VALUES (TG_TABLE_NAME, v_id, v_risco, TG_OP, NULL, v_old, v_new, v_email, v_nome, v_origem);
  END IF;

  RETURN NULL;
END;
$$;

-- Cenário dos riscos existentes.
UPDATE riscos SET causa = 'Biblioteca Python com vulnerabilidade conhecida (CVE) sem atualização', evento = 'Exploração de vulnerabilidade na aplicação', consequencia = 'Ataque com movimentação lateral no ambiente'
  WHERE id IN (1);
UPDATE riscos SET causa = 'Falta de controle automatizado da renovação de certificados SSL', evento = 'Expiração do certificado SSL do portal', consequencia = 'Indisponibilidade do portal de e-commerce por até 3 horas'
  WHERE id IN (2);
UPDATE riscos SET causa = 'Servidor legado sem suporte do fabricante', evento = 'Falha de hardware ou software no servidor legado', consequencia = 'Interrupção do serviço sem possibilidade de suporte técnico'
  WHERE id IN (3);
UPDATE riscos SET causa = 'Mudança de DNS aplicada sem validação prévia', evento = 'Configuração incorreta de DNS', consequencia = 'Portal indisponível ou direcionado para endereço incorreto'
  WHERE id IN (4);
UPDATE riscos SET causa = 'Integração com o gateway de pagamento sem monitoramento de falhas', evento = 'Falha na integração com o gateway de pagamento', consequencia = 'Compras não concluídas e perda temporária de receita'
  WHERE id IN (5);
UPDATE riscos SET causa = 'Capacidade do banco de dados insuficiente para a demanda de pico', evento = 'Saturação do banco de dados em horário de pico', consequencia = 'Lentidão severa e erros nas consultas do portal'
  WHERE id IN (6);
UPDATE riscos SET causa = 'Rotina de backup sem verificação da execução', evento = 'Falha na execução do backup', consequencia = 'Dados recentes sem cópia válida para recuperação'
  WHERE id IN (7);
UPDATE riscos SET causa = 'Serviço de autenticação corporativa sem redundância', evento = 'Indisponibilidade do serviço de autenticação corporativa', consequencia = 'Usuários impedidos de acessar aplicações internas'
  WHERE id IN (8);
UPDATE riscos SET causa = 'Permissões excessivas concedidas em pasta compartilhada', evento = 'Acesso indevido a documentos internos', consequencia = 'Exposição ou alteração indevida de documentos internos'
  WHERE id IN (9);
UPDATE riscos SET causa = 'Falta de monitoramento da capacidade de armazenamento', evento = 'Esgotamento do espaço de armazenamento', consequencia = 'Interrupção no salvamento e compartilhamento de arquivos'
  WHERE id IN (10);
UPDATE riscos SET causa = 'Colaboradores sem preparo para reconhecer phishing', evento = 'Comprometimento de credenciais por campanha de phishing', consequencia = 'Acesso não autorizado a sistemas corporativos'
  WHERE id IN (11);
UPDATE riscos SET causa = 'Atualização crítica adiada além do prazo', evento = 'Exploração de vulnerabilidade conhecida na intranet', consequencia = 'Comprometimento da intranet e dos dados nela armazenados'
  WHERE id IN (12);
UPDATE riscos SET causa = 'Enlace de rede principal sem redundância', evento = 'Instabilidade no enlace de rede principal', consequencia = 'Acesso intermitente à intranet e aos sistemas corporativos'
  WHERE id IN (13);
UPDATE riscos SET causa = 'Backups da intranet sem testes periódicos de restauração', evento = 'Falha na restauração do backup da intranet', consequencia = 'Recuperação incompleta de documentos e configurações'
  WHERE id IN (14);
UPDATE riscos SET causa = 'Discos do arranjo RAID sem monitoramento de saúde e troca preventiva', evento = 'Falha simultânea em discos do arranjo RAID', consequencia = 'Indisponibilidade das aplicações hospedadas nos servidores'
  WHERE id IN (15);
UPDATE riscos SET causa = 'Falha ou capacidade insuficiente da climatização do datacenter', evento = 'Temperatura acima do limite no datacenter', consequencia = 'Desligamento preventivo ou dano a equipamentos'
  WHERE id IN (16);
UPDATE riscos SET causa = 'Proteção insuficiente contra malware nos servidores de arquivos', evento = 'Infecção por ransomware em servidor de arquivos', consequencia = 'Criptografia de dados e interrupção das operações'
  WHERE id IN (17);
UPDATE riscos SET causa = 'Autonomia insuficiente do nobreak', evento = 'Queda no fornecimento de energia', consequencia = 'Desligamento abrupto de servidores e risco de corrupção de dados'
  WHERE id IN (18);
UPDATE riscos SET causa = 'Agente de monitoramento sem verificação de comunicação', evento = 'Perda de comunicação do agente de monitoramento', consequencia = 'Incidentes deixam de ser detectados em tempo adequado'
  WHERE id IN (19);
UPDATE riscos SET causa = 'Regras temporárias de firewall sem controle de expiração', evento = 'Manutenção de regra temporária após o prazo aprovado', consequencia = 'Acesso indevido a serviços expostos pela rede'
  WHERE id IN (20);
UPDATE riscos SET causa = 'Firmware do firewall desatualizado', evento = 'Exploração de vulnerabilidade crítica no firmware do firewall', consequencia = 'Exploração remota e comprometimento do perímetro'
  WHERE id IN (21);
UPDATE riscos SET causa = 'Mecanismo de alta disponibilidade sem testes periódicos de failover', evento = 'Falha no failover para o equipamento secundário', consequencia = 'Interrupção do tráfego em caso de falha do equipamento principal'
  WHERE id IN (22);
UPDATE riscos SET causa = 'Ausência de proteção contra DDoS no link de internet', evento = 'Ataque volumétrico de negação de serviço', consequencia = 'Saturação do link e indisponibilidade dos serviços externos'
  WHERE id IN (23);
UPDATE riscos SET causa = 'Integração de logs com o SIEM sem monitoramento', evento = 'Interrupção do envio de logs para o SIEM', consequencia = 'Perda de visibilidade e atraso na investigação de incidentes'
  WHERE id IN (24);
UPDATE riscos SET causa = 'Controle orçamentário insuficiente sobre os custos operacionais', evento = 'Aumento de custos acima do orçado', consequencia = 'Redução de margem e necessidade de revisão do orçamento anual'
  WHERE id IN (25, 29, 33, 37, 41, 45, 49, 53);
UPDATE riscos SET causa = 'Vulnerabilidades críticas sem correção dentro do prazo', evento = 'Exploração de vulnerabilidade crítica', consequencia = 'Exposição de dados, indisponibilidade e necessidade de resposta a incidente'
  WHERE id IN (26, 30, 34, 38, 42, 46, 50, 54);
UPDATE riscos SET causa = 'Dependências e capacidade do processo essencial sem monitoramento', evento = 'Atraso na execução de processo essencial', consequencia = 'Interrupção parcial do processo e descumprimento de prazo acordado'
  WHERE id IN (27, 31, 35, 39, 43, 47, 51, 55);
UPDATE riscos SET causa = 'Falhas na qualidade do atendimento e da entrega ao cliente', evento = 'Queda na satisfação dos clientes', consequencia = 'Aumento de churn e deterioração da reputação da marca'
  WHERE id IN (28, 32, 36, 40, 44, 48, 52, 56);
UPDATE riscos SET causa = 'Ausência de login único (SSO) nos sistemas', evento = 'Comprometimento de credenciais fracas ou reutilizadas', consequencia = 'Acesso não autorizado e vazamento de dados por phishing ou força bruta'
  WHERE id IN (57);
UPDATE riscos SET causa = 'Processo de gestão de vulnerabilidades não executado', evento = 'Exploração de vulnerabilidades (CVEs) não tratadas', consequencia = 'Comprometimento do ambiente'
  WHERE id IN (58);

COMMIT;
