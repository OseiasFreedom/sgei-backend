-- ============================================================
--  SGEI — Sistema de Gestão Eclesiástica Integrado
--  Schema PostgreSQL completo
--  Execute no Supabase: SQL Editor > New Query > Run
-- ============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────
-- 1. IGREJAS (Sede + Congregações)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS igrejas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        VARCHAR(150) NOT NULL,
  tipo        VARCHAR(20)  NOT NULL CHECK (tipo IN ('sede','congregacao')),
  sede_id     UUID REFERENCES igrejas(id) ON DELETE SET NULL,
  endereco    TEXT,
  cidade      VARCHAR(100),
  estado      VARCHAR(2),
  telefone    VARCHAR(20),
  email       VARCHAR(150),
  logo_url    TEXT,
  ativa       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 2. USUÁRIOS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  senha_hash    TEXT NOT NULL,
  nome          VARCHAR(150) NOT NULL,
  papel         VARCHAR(30)  NOT NULL CHECK (papel IN ('admin_geral','admin_congregacao','membro')),
  igreja_id     UUID REFERENCES igrejas(id) ON DELETE SET NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login  TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deletado_em   TIMESTAMPTZ
);

-- ────────────────────────────────────────────────
-- 3. MEMBROS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS membros (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id          UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  igreja_id           UUID NOT NULL REFERENCES igrejas(id),
  nome_completo       VARCHAR(200) NOT NULL,
  data_nascimento     DATE,
  cpf                 VARCHAR(14) UNIQUE,
  rg                  VARCHAR(20),
  telefone            VARCHAR(20),
  telefone2           VARCHAR(20),
  email               VARCHAR(150),
  endereco            TEXT,
  bairro              VARCHAR(100),
  cidade              VARCHAR(100),
  estado              VARCHAR(2),
  cep                 VARCHAR(9),
  foto_url            TEXT,
  estado_civil        VARCHAR(20) CHECK (estado_civil IN ('solteiro','casado','divorciado','viuvo','uniao_estavel')),
  profissao           VARCHAR(100),
  escolaridade        VARCHAR(50),
  data_batismo        DATE,
  data_membro         DATE,
  funcao_ministerial  VARCHAR(100),
  observacoes         TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'ativo'
                      CHECK (status IN ('ativo','inativo','transferido','pendente','falecido')),
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deletado_em         TIMESTAMPTZ
);

-- ────────────────────────────────────────────────
-- 4. CATEGORIAS FINANCEIRAS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financeiro_categorias (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome      VARCHAR(100) NOT NULL,
  tipo      VARCHAR(10)  NOT NULL CHECK (tipo IN ('entrada','saida')),
  descricao TEXT,
  icone     VARCHAR(50),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dados iniciais de categorias
INSERT INTO financeiro_categorias (nome, tipo, descricao) VALUES
  ('Dízimos',           'entrada', 'Dízimos dos membros'),
  ('Ofertas',           'entrada', 'Ofertas gerais'),
  ('Oferta Missionária','entrada', 'Ofertas para missões'),
  ('Doações',           'entrada', 'Doações diversas'),
  ('Aluguel de espaço', 'entrada', 'Locação do templo'),
  ('Contas de consumo', 'saida',   'Água, luz, gás, internet'),
  ('Material de limpeza','saida',  'Produtos de limpeza e higiene'),
  ('Manutenção',        'saida',   'Reparos e manutenção do templo'),
  ('Salários',          'saida',   'Pagamento de funcionários'),
  ('Missões',           'saida',   'Envio de recursos para missões'),
  ('Eventos',           'saida',   'Despesas com eventos e cultos'),
  ('Outros',            'saida',   'Outras despesas')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────
-- 5. LANÇAMENTOS FINANCEIROS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  igreja_id       UUID NOT NULL REFERENCES igrejas(id),
  categoria_id    UUID REFERENCES financeiro_categorias(id),
  tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada','saida')),
  valor           NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  descricao       TEXT,
  data_lancamento DATE NOT NULL,
  referencia_mes  VARCHAR(7),  -- ex: '2025-06'
  registrado_por  UUID REFERENCES usuarios(id),
  comprovante_url TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deletado_em     TIMESTAMPTZ
);

-- ────────────────────────────────────────────────
-- 6. EVENTOS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  igreja_id     UUID NOT NULL REFERENCES igrejas(id),
  titulo        VARCHAR(200) NOT NULL,
  descricao     TEXT,
  data_inicio   TIMESTAMPTZ NOT NULL,
  data_fim      TIMESTAMPTZ,
  local         VARCHAR(200),
  escopo        VARCHAR(20) NOT NULL DEFAULT 'local' CHECK (escopo IN ('geral','local')),
  bloqueio_data BOOLEAN NOT NULL DEFAULT FALSE,
  cor           VARCHAR(7) DEFAULT '#185FA5',
  criado_por    UUID REFERENCES usuarios(id),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deletado_em   TIMESTAMPTZ
);

-- ────────────────────────────────────────────────
-- 7. CARTEIRINHAS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carteirinhas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membro_id     UUID NOT NULL REFERENCES membros(id),
  numero_cartao VARCHAR(30) UNIQUE NOT NULL,
  data_emissao  DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE NOT NULL,
  pdf_url       TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'ativa'
                CHECK (status IN ('ativa','vencida','cancelada')),
  emitida_por   UUID REFERENCES usuarios(id),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 8. CARTAS DE RECOMENDAÇÃO
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cartas_recomendacao (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membro_id     UUID NOT NULL REFERENCES membros(id),
  destino_nome  VARCHAR(200),
  destino_pastor VARCHAR(150),
  observacoes   TEXT,
  pdf_url       TEXT,
  emitida_por   UUID REFERENCES usuarios(id),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 9. COMUNICADOS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comunicados (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  igreja_id     UUID NOT NULL REFERENCES igrejas(id),
  titulo        VARCHAR(200) NOT NULL,
  mensagem      TEXT NOT NULL,
  canal         VARCHAR(20) NOT NULL CHECK (canal IN ('whatsapp','sms','email','todos')),
  destinatarios JSONB,        -- array de IDs ou 'todos'
  status        VARCHAR(20) NOT NULL DEFAULT 'rascunho'
                CHECK (status IN ('rascunho','enviado','agendado','falhou')),
  agendado_para TIMESTAMPTZ,
  enviado_em    TIMESTAMPTZ,
  total_enviados INT DEFAULT 0,
  enviado_por   UUID REFERENCES usuarios(id),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 10. LOGS DE AUDITORIA
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id   UUID REFERENCES usuarios(id),
  usuario_nome VARCHAR(150),
  acao         VARCHAR(50) NOT NULL,
  tabela_alvo  VARCHAR(50) NOT NULL,
  registro_id  UUID,
  dados_antes  JSONB,
  dados_depois JSONB,
  ip_address   INET,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 11. VIEWS
-- ────────────────────────────────────────────────

CREATE OR REPLACE VIEW vw_membros_ativos AS
  SELECT m.*, i.nome AS nome_igreja, i.tipo AS tipo_igreja
  FROM membros m
  JOIN igrejas i ON i.id = m.igreja_id
  WHERE m.deletado_em IS NULL AND m.status = 'ativo';

CREATE OR REPLACE VIEW vw_saldo_igrejas AS
  SELECT
    i.id,
    i.nome,
    i.tipo,
    COUNT(DISTINCT m.id) FILTER (WHERE m.deletado_em IS NULL AND m.status = 'ativo') AS total_membros,
    COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada' AND l.deletado_em IS NULL), 0) AS total_entradas,
    COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'   AND l.deletado_em IS NULL), 0) AS total_saidas,
    COALESCE(SUM(CASE WHEN l.tipo='entrada' THEN l.valor ELSE -l.valor END) FILTER (WHERE l.deletado_em IS NULL), 0) AS saldo
  FROM igrejas i
  LEFT JOIN membros m ON m.igreja_id = i.id
  LEFT JOIN lancamentos_financeiros l ON l.igreja_id = i.id
  WHERE i.ativa = TRUE
  GROUP BY i.id, i.nome, i.tipo;

CREATE OR REPLACE VIEW vw_itens_deletados AS
  SELECT 'membro'::text tipo_registro, id, nome_completo AS descricao, deletado_em, igreja_id FROM membros WHERE deletado_em IS NOT NULL
  UNION ALL
  SELECT 'lancamento', id, COALESCE(descricao,'Lançamento'), deletado_em, igreja_id FROM lancamentos_financeiros WHERE deletado_em IS NOT NULL
  UNION ALL
  SELECT 'evento', id, titulo, deletado_em, igreja_id FROM eventos WHERE deletado_em IS NOT NULL;

-- ────────────────────────────────────────────────
-- 12. ÍNDICES
-- ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_membros_igreja    ON membros(igreja_id) WHERE deletado_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_membros_status    ON membros(status)    WHERE deletado_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_lancamentos_igreja ON lancamentos_financeiros(igreja_id, data_lancamento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_mes   ON lancamentos_financeiros(referencia_mes);
CREATE INDEX IF NOT EXISTS idx_eventos_data      ON eventos(data_inicio) WHERE deletado_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_papel    ON usuarios(papel, igreja_id);
CREATE INDEX IF NOT EXISTS idx_logs_tabela       ON logs_auditoria(tabela_alvo, registro_id);
CREATE INDEX IF NOT EXISTS idx_logs_usuario      ON logs_auditoria(usuario_id, criado_em);

-- ────────────────────────────────────────────────
-- 13. TRIGGER: atualizado_em automático
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_membros_updated
  BEFORE UPDATE ON membros
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER trg_igrejas_updated
  BEFORE UPDATE ON igrejas
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER trg_eventos_updated
  BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
