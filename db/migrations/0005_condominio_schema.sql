-- Gestão de Condomínio — schema inicial (chamados, fornecedores, tipos de
-- chamado, mensagens e agendamentos). Reconstrução do que existia no Bubble
-- (app "tavaresrodrigo"), adaptado ao padrão deste projeto.
-- Rode isso no SQL Editor do Neon (ou via
-- `psql "$DATABASE_URL" -f db/migrations/0005_condominio_schema.sql`).
-- Idempotente — pode rodar mais de uma vez sem erro.

CREATE TABLE IF NOT EXISTS tipos_chamado (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  sla_horas integer NOT NULL,
  criado_por text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id serial PRIMARY KEY,
  nome_fantasia text NOT NULL,
  cnpj text,
  categoria_servico text,
  nome_contato text,
  email text,
  telefone text,
  cadastrado_por text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Status possíveis: Novo, Em andamento, Aguardando fornecedor, Paralisado,
-- Resolvido, Reaberto, Cancelado.
-- Urgência possível: Baixa, Média, Urgente.
CREATE TABLE IF NOT EXISTS chamados (
  id serial PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  tipo_id integer REFERENCES tipos_chamado(id),
  urgencia text,
  status text NOT NULL DEFAULT 'Novo',
  fornecedor_id integer REFERENCES fornecedores(id),
  prazo_sla timestamptz,
  global boolean NOT NULL DEFAULT false,
  justificativa_ultima_movimentacao text,
  aberto_por_email text NOT NULL,
  aberto_por_nome text,
  aberto_por_unidade text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chamados_aberto_por_email ON chamados(aberto_por_email);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados(status);

CREATE TABLE IF NOT EXISTS mensagens (
  id serial PRIMARY KEY,
  chamado_id integer NOT NULL REFERENCES chamados(id),
  autor_email text,
  autor_nome text,
  texto text NOT NULL,
  visivel_condomino boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_chamado_id ON mensagens(chamado_id);

-- Arquivo ainda não tem upload implementado (sem storage configurado no
-- projeto) — a coluna já existe pra quando a feature for ligada.
CREATE TABLE IF NOT EXISTS anexos (
  id serial PRIMARY KEY,
  chamado_id integer NOT NULL REFERENCES chamados(id),
  arquivo_url text,
  tipo_anexo text,
  enviado_por_email text,
  enviado_por_nome text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id serial PRIMARY KEY,
  chamado_id integer REFERENCES chamados(id),
  fornecedor_id integer REFERENCES fornecedores(id),
  data_hora timestamptz,
  descricao_servico text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_chamado_id ON agendamentos(chamado_id);
