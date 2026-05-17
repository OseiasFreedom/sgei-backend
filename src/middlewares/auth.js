const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');

const autenticar = async (req, res, next) => {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) return res.status(401).json({ erro: 'Token não fornecido' });
    const decoded = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET);
    const { rows } = await query('SELECT id,nome,email,papel,igreja_id,ativo FROM usuarios WHERE id=$1 AND deletado_em IS NULL', [decoded.id]);
    if (!rows.length || !rows[0].ativo) return res.status(401).json({ erro: 'Usuário inativo' });
    req.usuario = rows[0]; next();
  } catch (e) {
    res.status(401).json({ erro: e.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido' });
  }
};

const exigirPapel = (...papeis) => (req, res, next) =>
  papeis.includes(req.usuario.papel) ? next() : res.status(403).json({ erro: 'Permissão insuficiente' });

const escopoIgreja = (req, res, next) => {
  if (req.usuario.papel === 'admin_geral') return next();
  const id = req.params.igrejaId || req.body.igreja_id || req.query.igreja_id;
  if (id && id !== req.usuario.igreja_id) return res.status(403).json({ erro: 'Escopo inválido' });
  if (!req.body.igreja_id) req.body.igreja_id = req.usuario.igreja_id;
  next();
};

module.exports = { autenticar, exigirPapel, escopoIgreja };
