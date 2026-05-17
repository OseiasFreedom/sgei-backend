const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
});
const query = async (text, params) => {
  try { return await pool.query(text, params); }
  catch (err) { console.error('[DB]', err.message); throw err; }
};
module.exports = { pool, query };
