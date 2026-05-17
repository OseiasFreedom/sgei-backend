/**
 * Cria o primeiro Administrador Geral no banco
 * Uso: node src/utils/criarAdmin.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('../../config/database');

const ADMIN = {
  nome:      'Administrador Geral',
  email:     'admin@sgei.com.br',
  senha:     'Admin@2025!',   // TROQUE APÓS O PRIMEIRO LOGIN
  papel:     'admin_geral',
  igreja_id: null,            // será atualizado após criar a sede
};

async function main() {
  try {
    console.log('🔑 Criando Admin Geral...');
    const hash = await bcrypt.hash(ADMIN.senha, 12);

    // Verificar se já existe
    const ex = await query('SELECT id FROM usuarios WHERE email=$1', [ADMIN.email]);
    if (ex.rows.length) { console.log('⚠️  Admin já existe:', ADMIN.email); return; }

    // Buscar a sede (se existir)
    const sede = await query("SELECT id FROM igrejas WHERE tipo='sede' LIMIT 1");
    const igrejaId = sede.rows[0]?.id || null;

    const { rows } = await query(
      `INSERT INTO usuarios (nome,email,senha_hash,papel,igreja_id) VALUES ($1,$2,$3,$4,$5) RETURNING id,email`,
      [ADMIN.nome, ADMIN.email, hash, ADMIN.papel, igrejaId]
    );

    console.log('✅ Admin criado!');
    console.log('   ID:', rows[0].id);
    console.log('   Email:', rows[0].email);
    console.log('   Senha:', ADMIN.senha);
    console.log('\n⚠️  TROQUE A SENHA NO PRIMEIRO LOGIN!\n');
  } catch (e) {
    console.error('❌ Erro:', e.message);
  } finally {
    await pool.end();
  }
}

main();
