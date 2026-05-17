-- ============================================================
--  SGEI — Dados iniciais
--  Execute APÓS o schema.sql
-- ============================================================

-- 1. Criar a Igreja Sede
INSERT INTO igrejas (id, nome, tipo, cidade, estado, email)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Igreja Sede Central',
  'sede',
  'São Paulo',
  'SP',
  'sede@suaigreja.com.br'
) ON CONFLICT DO NOTHING;

-- 2. Criar uma Congregação de exemplo
INSERT INTO igrejas (id, nome, tipo, sede_id, cidade, estado)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000002',
  'Congregação Vila Nova',
  'congregacao',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'São Paulo',
  'SP'
) ON CONFLICT DO NOTHING;

-- 3. Criar Admin Geral
-- Senha: Admin@123 (troque imediatamente após o primeiro login!)
-- Hash bcrypt de 'Admin@123' com salt=12
INSERT INTO usuarios (email, senha_hash, nome, papel, igreja_id)
VALUES (
  'admin@sgei.com.br',
  '$2a$12$LQv3c1yqBwEHXp2J7/OqQ.mQqO9Lc/wfpBHhS7V/SGEI.PLACEHOLDER',
  'Administrador Geral',
  'admin_geral',
  'aaaaaaaa-0000-0000-0000-000000000001'
) ON CONFLICT DO NOTHING;

-- ATENÇÃO: O hash acima é um placeholder.
-- Para criar o admin real, use o endpoint POST /api/auth/registrar
-- ou rode o script de seed Node.js:  node src/utils/criarAdmin.js
