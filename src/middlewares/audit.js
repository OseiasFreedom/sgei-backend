const { query } = require('../../config/database');

const registrarLog = (acao, tabela) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  const dadosAntes = req.dadosAntes || null;

  res.json = async (body) => {
    if (res.statusCode < 400 && req.usuario) {
      try {
        const registroId = body?.dados?.id || body?.id || req.params.id || null;
        await query(
          `INSERT INTO logs_auditoria (usuario_id, usuario_nome, acao, tabela_alvo, registro_id, dados_antes, dados_depois, ip_address)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            req.usuario.id,
            req.usuario.nome,
            acao,
            tabela,
            registroId,
            dadosAntes ? JSON.stringify(dadosAntes) : null,
            body?.dados ? JSON.stringify(body.dados) : null,
            req.ip,
          ]
        );
      } catch (e) {
        console.error('[AUDIT ERROR]', e.message);
      }
    }
    return originalJson(body);
  };
  next();
};

module.exports = { registrarLog };
