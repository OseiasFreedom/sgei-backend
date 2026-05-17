const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');

const gerarToken = (u) => jwt.sign({ id: u.id, papel: u.papel, igreja_id: u.igreja_id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatórios' });
    const { rows } = await query('SELECT * FROM usuarios WHERE email=$1 AND deletado_em IS NULL', [email.toLowerCase()]);
    const u = rows[0];
    if (!u || !u.ativo || !(await bcrypt.compare(senha, u.senha_hash)))
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    await query('UPDATE usuarios SET ultimo_login=NOW() WHERE id=$1', [u.id]);
    let nome_igreja = null;
    if (u.igreja_id) { const r = await query('SELECT nome FROM igrejas WHERE id=$1',[u.igreja_id]); nome_igreja = r.rows[0]?.nome; }
    const { senha_hash, ...dados } = u;
    res.json({ token: gerarToken(u), usuario: { ...dados, nome_igreja } });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const registrar = async (req, res) => {
  try {
    const { nome, email, senha, igreja_id } = req.body;
    if (!nome||!email||!senha||!igreja_id) return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
    const ex = await query('SELECT id FROM usuarios WHERE email=$1',[email.toLowerCase()]);
    if (ex.rows.length) return res.status(409).json({ erro: 'Email já cadastrado' });
    const hash = await bcrypt.hash(senha, 12);
    const { rows } = await query(`INSERT INTO usuarios (nome,email,senha_hash,papel,igreja_id) VALUES ($1,$2,$3,'membro',$4) RETURNING id,nome,email,papel,igreja_id`,[nome,email.toLowerCase(),hash,igreja_id]);
    res.status(201).json({ token: gerarToken(rows[0]), usuario: rows[0] });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const me = async (req, res) => {
  try {
    const { rows } = await query(`SELECT u.id,u.nome,u.email,u.papel,u.igreja_id,u.ultimo_login,i.nome AS nome_igreja,i.logo_url FROM usuarios u LEFT JOIN igrejas i ON i.id=u.igreja_id WHERE u.id=$1`,[req.usuario.id]);
    res.json({ dados: rows[0] });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criarAdmin = async (req, res) => {
  try {
    const { nome, email, senha, papel, igreja_id } = req.body;
    if (!['admin_geral','admin_congregacao'].includes(papel)) return res.status(400).json({ erro: 'Papel inválido' });
    const hash = await bcrypt.hash(senha, 12);
    const { rows } = await query(`INSERT INTO usuarios (nome,email,senha_hash,papel,igreja_id) VALUES ($1,$2,$3,$4,$5) RETURNING id,nome,email,papel,igreja_id`,[nome,email.toLowerCase(),hash,papel,igreja_id||null]);
    res.status(201).json({ dados: rows[0] });
  } catch (e) {
    if (e.code==='23505') return res.status(409).json({ erro: 'Email já cadastrado' });
    res.status(500).json({ erro: 'Erro interno' });
  }
};

module.exports = { login, registrar, me, criarAdmin };
