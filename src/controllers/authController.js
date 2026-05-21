const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
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
    const { rows } = await query('SELECT id, nome FROM usuarios WHERE email=$1 AND deletado_em IS NULL AND ativo=true',[email.toLowerCase()]);
    if (!rows.length) return res.json({ mensagem: 'Se o email existir, você receberá um link de recuperação.' });
    const usuario = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000);
    await query('UPDATE password_reset_tokens SET usado=true WHERE usuario_id=$1 AND usado=false', [usuario.id]);
    await query('INSERT INTO password_reset_tokens (usuario_id, token, expira_em) VALUES ($1, $2, $3)',[usuario.id, token, expira]);
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const resetUrl = `${process.env.FRONTEND_URL}/redefinir-senha?token=${token}`;
    await sgMail.send({
      to: email.toLowerCase(), from: process.env.SENDGRID_FROM,
      subject: 'Redefinição de senha - SGEI',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;"><h2 style="color:#0f1e3d;">SGEI - Redefinição de Senha</h2><p>Olá, <strong>${usuario.nome}</strong>!</p><p>Clique no link abaixo para redefinir sua senha:</p><a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#0f1e3d;color:#e8cc7a;text-decoration:none;border-radius:8px;">Redefinir Senha</a><p style="color:#888;font-size:13px;">⏱ Expira em 1 hora.</p></div>`
    });
    res.json({ mensagem: 'Se o email existir, você receberá um link de recuperação.' });
  } catch (e) { console.error('Erro forgotPassword:', e); res.status(500).json({ erro: 'Erro ao enviar email' }); }
};

const resetPassword = async (req, res) => {
  try {
    const { token, nova_senha } = req.body;
    if (!token || !nova_senha) return res.status(400).json({ erro: 'Token e nova senha obrigatórios' });
    if (nova_senha.length < 6) return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres' });
    const { rows } = await query('SELECT * FROM password_reset_tokens WHERE token=$1 AND usado=false AND expira_em > NOW()',[token]);
    if (!rows.length) return res.status(400).json({ erro: 'Token inválido ou expirado' });
    const resetToken = rows[0];
    const hash = await bcrypt.hash(nova_senha, 12);
    await query('UPDATE usuarios SET senha_hash=$1 WHERE id=$2', [hash, resetToken.usuario_id]);
    await query('UPDATE password_reset_tokens SET usado=true WHERE id=$1', [resetToken.id]);
    res.json({ mensagem: 'Senha redefinida com sucesso!' });
  } catch (e) { console.error('Erro resetPassword:', e); res.status(500).json({ erro: 'Erro interno' }); }
};

const completarPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const igrejaId = req.usuario.igreja_id;
    const f = req.body;
    if (!f.nome_completo) return res.status(400).json({ erro: 'Nome completo é obrigatório' });

    const jaExiste = await query('SELECT id FROM membros WHERE usuario_id=$1 AND deletado_em IS NULL', [usuarioId]);
    let membro;

    if (jaExiste.rows.length) {
      const { rows } = await query(`UPDATE membros SET
        nome_completo=$1,data_nascimento=$2,cpf=$3,rg=$4,telefone=$5,
        telefone2=$6,email=$7,endereco=$8,bairro=$9,cidade=$10,
        estado=$11,cep=$12,estado_civil=$13,profissao=$14,
        escolaridade=$15,data_batismo=$16,data_membro=$17,
        funcao_ministerial=$18,observacoes=$19
        WHERE usuario_id=$20 AND deletado_em IS NULL RETURNING *`,
        [f.nome_completo,f.data_nascimento||null,f.cpf||null,f.rg||null,
         f.telefone||null,f.telefone2||null,f.email||null,f.endereco||null,
         f.bairro||null,f.cidade||null,f.estado||null,f.cep||null,
         f.estado_civil||null,f.profissao||null,f.escolaridade||null,
         f.data_batismo||null,f.data_membro||null,f.funcao_ministerial||null,
         f.observacoes||null,usuarioId]);
      membro = rows[0];
    } else {
      const { rows } = await query(`INSERT INTO membros
        (id,igreja_id,usuario_id,nome_completo,data_nascimento,cpf,rg,telefone,
         telefone2,email,endereco,bairro,cidade,estado,cep,estado_civil,
         profissao,escolaridade,data_batismo,data_membro,funcao_ministerial,
         observacoes,status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'ativo') RETURNING *`,
        [uuid(),igrejaId,usuarioId,f.nome_completo,f.data_nascimento||null,
         f.cpf||null,f.rg||null,f.telefone||null,f.telefone2||null,
         f.email||null,f.endereco||null,f.bairro||null,f.cidade||null,
         f.estado||null,f.cep||null,f.estado_civil||null,f.profissao||null,
         f.escolaridade||null,f.data_batismo||null,f.data_membro||null,
         f.funcao_ministerial||null,f.observacoes||null]);
      membro = rows[0];

      // Email de boas-vindas
      try {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const ig = await query('SELECT nome FROM igrejas WHERE id=$1',[igrejaId]);
        const nomeIgreja = ig.rows[0]?.nome || 'nossa Igreja';
        const emailDestino = f.email || req.usuario.email;
        if (emailDestino) {
          await sgMail.send({
            to: emailDestino, from: process.env.SENDGRID_FROM,
            subject: `Bem-vindo à Família ${nomeIgreja}! 🙏`,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f7;padding:32px;border-radius:12px;">
              <div style="text-align:center;margin-bottom:24px;">
                <h2 style="color:#0f1e3d;">SGEI - Sistema de Gestão Eclesiástica</h2>
              </div>
              <div style="background:#fff;border-radius:10px;padding:28px;">
                <h3 style="color:#0f1e3d;">Bem-vindo(a) à nossa Família Remanescentes! 🙏</h3>
                <p>Olá, <strong>${f.nome_completo}</strong>!</p>
                <p>É com muita alegria que recebemos você como membro da <strong>${nomeIgreja}</strong>.</p>
                <p>Seu cadastro foi realizado com sucesso. Em breve você receberá a sua <strong>carteirinha de membro</strong>.</p>
                <div style="background:#f0f4ff;border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid #0f1e3d;">
                  <p style="color:#0f1e3d;margin:0;font-style:italic;">"Porque onde estiverem dois ou três reunidos em meu nome, aí estou eu no meio deles." — Mateus 18:20</p>
                </div>
              </div>
            </div>`
          });
        }
      } catch (emailErr) { console.error('Erro email boas-vindas:', emailErr); }
    }

    res.json({ dados: membro, mensagem: 'Perfil salvo com sucesso!' });
  } catch (e) {
    if (e.code==='23505') return res.status(409).json({ erro: 'CPF já cadastrado' });
    console.error('Erro completarPerfil:', e);
    res.status(500).json({ erro: 'Erro interno' });
  }
};

module.exports = { login, registrar, me, criarAdmin, forgotPassword, resetPassword, completarPerfil };
