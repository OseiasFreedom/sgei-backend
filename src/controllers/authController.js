const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ erro: 'Email obrigatório' });

    const { rows } = await query(
      'SELECT id, nome FROM usuarios WHERE email=$1 AND deletado_em IS NULL AND ativo=true',
      [email.toLowerCase()]
    );

    // Sempre retorna sucesso para não revelar quais emails existem
    if (!rows.length) return res.json({ mensagem: 'Se o email existir, você receberá um link de recuperação.' });

    const usuario = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Invalida tokens antigos
    await query('UPDATE password_reset_tokens SET usado=true WHERE usuario_id=$1 AND usado=false', [usuario.id]);

    // Cria novo token
    await query(
      'INSERT INTO password_reset_tokens (usuario_id, token, expira_em) VALUES ($1, $2, $3)',
      [usuario.id, token, expira]
    );

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const resetUrl = `${process.env.FRONTEND_URL}/redefinir-senha?token=${token}`;

    await sgMail.send({
      to: email.toLowerCase(),
      from: process.env.SENDGRID_FROM,
      subject: 'Redefinição de senha - SGEI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f7; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; background: linear-gradient(135deg,#c9a84c,#e8cc7a); border-radius: 12px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">✝</div>
            <h2 style="color: #0f1e3d; margin: 0;">SGEI - Sistema de Gestão Eclesiástica</h2>
          </div>
          <div style="background: #fff; border-radius: 10px; padding: 28px;">
            <h3 style="color: #0f1e3d; margin-top: 0;">Redefinição de Senha</h3>
            <p style="color: #444;">Olá, <strong>${usuario.nome}</strong>!</p>
            <p style="color: #444;">Você solicitou a redefinição da sua senha. Clique no botão abaixo para criar uma nova senha:</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: #0f1e3d; color: #e8cc7a; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">Redefinir Minha Senha</a>
            </div>
            <p style="color: #888; font-size: 13px;">⏱ Este link expira em <strong>1 hora</strong>.</p>
            <p style="color: #888; font-size: 13px;">Se você não solicitou a redefinição de senha, ignore este email.</p>
          </div>
          <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 20px;">SGEI — Sistema de Gestão Eclesiástica</p>
        </div>
      `
    });

    res.json({ mensagem: 'Se o email existir, você receberá um link de recuperação.' });
  } catch (e) {
    console.error('Erro forgotPassword:', e);
    res.status(500).json({ erro: 'Erro ao enviar email' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, nova_senha } = req.body;
    if (!token || !nova_senha) return res.status(400).json({ erro: 'Token e nova senha obrigatórios' });
    if (nova_senha.length < 6) return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres' });

    const { rows } = await query(
      'SELECT * FROM password_reset_tokens WHERE token=$1 AND usado=false AND expira_em > NOW()',
      [token]
    );

    if (!rows.length) return res.status(400).json({ erro: 'Token inválido ou expirado' });

    const resetToken = rows[0];
    const hash = await bcrypt.hash(nova_senha, 12);

    await query('UPDATE usuarios SET senha_hash=$1 WHERE id=$2', [hash, resetToken.usuario_id]);
    await query('UPDATE password_reset_tokens SET usado=true WHERE id=$1', [resetToken.id]);

    res.json({ mensagem: 'Senha redefinida com sucesso!' });
  } catch (e) {
    console.error('Erro resetPassword:', e);
    res.status(500).json({ erro: 'Erro interno' });
  }
};

module.exports = { login, registrar, me, criarAdmin, forgotPassword, resetPassword };
