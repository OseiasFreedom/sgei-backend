require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
bcrypt.hash('Igreja2025', 12).then(h => 
  p.query('UPDATE usuarios SET senha_hash= WHERE email=', [h, 'admin@sgei.com.br'])
).then(r => console.log('ATUALIZADO! Linhas:', r.rowCount))
.catch(e => console.log('ERRO:', e.message))
.finally(() => p.end());
