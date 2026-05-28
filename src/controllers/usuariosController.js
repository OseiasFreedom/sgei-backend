const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');

// GET /usuarios — lista todos os usuários da igreja (ou todos se admin_geral)
const listarUsuarios = async (req, res) => {
  try {
    const isAdminGeral = req.usuario.papel === 'admin_geral';
    const igrejaId = isAdminGeral ? req.query.igreja_id : req.usuario.igreja_id;

    const cond = igrejaId ? 'WHERE u.igreja_id = $1 AND u.deletado_em IS NULL' : 'WHERE u.deletado_em IS NULL';
    const params = igrejaId ? [igrejaId] : [];

    const { rows } = await query(
      `SELECT u.id, u.nome, u.email, u.papel, u.ativo, u.ultimo_login, u.criado_em,
              i.nome AS nome_igreja
       FROM usuarios u
       LEFT JOIN igrejas i ON i.id = u.igreja_id
       ${cond}
       ORDER BY u.criado_em DESC`,
      params
    );
    res.json({ dados: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
};

// GET /usuarios/:id — detalhes de um usuário
const obterUsuario = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.nome, u.email, u.papel, u.ativo, u.igreja_id, u.ultimo_login, u.criado_em,
              i.nome AS nome_igreja
       FROM usuarios u
       LEFT JOIN igrejas i ON i.id = u.igreja_id
       WHERE u.id = $1 AND u.deletado_em IS NULL`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ dados: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
};

// PUT /usuarios/:id — editar nome, email, papel, igreja, ativo e opcionalmente senha
const editarUsuario = async (req, res) => {
  try {
    const { nome, email, papel, igreja_id, ativo, nova_senha } = req.body;
    const papeisValidos = ['admin_geral', 'admin_congregacao', 'pastor', 'membro'];
    if (papel && !papeisValidos.includes(papel))
      return res.status(400).json({ erro: 'Papel inválido' });

    // Verificar se email já existe em outro usuário
    if (email) {
      const { rows: dup } = await query(
        'SELECT id FROM usuarios WHERE email = $1 AND id != $2 AND deletado_em IS NULL',
        [email.toLowerCase(), req.params.id]
      );
      if (dup.length) return res.status(409).json({ erro: 'Email já está em uso por outro usuário' });
    }

    let senhaUpdate = '';
    let senhaParams = [];
    if (nova_senha) {
      if (nova_senha.length < 6) return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres' });
      const hash = await bcrypt.hash(nova_senha, 12);
      senhaUpdate = ', senha_hash = $6';
      senhaParams = [hash];
    }

    const { rows } = await query(
      `UPDATE usuarios
       SET nome = $1, email = $2, papel = $3, igreja_id = $4, ativo = $5 ${senhaUpdate}
       WHERE id = ${nova_senha ? '$7' : '$6'} AND deletado_em IS NULL
       RETURNING id, nome, email, papel, igreja_id, ativo`,
      [nome, email?.toLowerCase(), papel, igreja_id || null, ativo ?? true, ...senhaParams, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ dados: rows[0], mensagem: 'Usuário atualizado com sucesso!' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
};

// PATCH /usuarios/:id/toggle — ativar ou desativar
const toggleAtivo = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE usuarios SET ativo = NOT ativo WHERE id = $1 AND deletado_em IS NULL RETURNING id, nome, ativo`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });
    const status = rows[0].ativo ? 'ativado' : 'desativado';
    res.json({ dados: rows[0], mensagem: `Usuário ${status} com sucesso!` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
};

// DELETE /usuarios/:id — soft delete
const deletarUsuario = async (req, res) => {
  try {
    // Não deixar deletar a si mesmo
    if (req.params.id === req.usuario.id)
      return res.status(400).json({ erro: 'Você não pode excluir sua própria conta' });

    const { rows } = await query(
      `UPDATE usuarios SET deletado_em = NOW(), ativo = false WHERE id = $1 AND deletado_em IS NULL RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ mensagem: 'Usuário removido com sucesso!' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
};

module.exports = { listarUsuarios, obterUsuario, editarUsuario, toggleAtivo, deletarUsuario };
