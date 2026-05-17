const { query } = require('../../config/database');

const listar = async (req, res) => {
  try {
    const iId = req.usuario.papel==='admin_geral' ? req.query.igreja_id : req.usuario.igreja_id;
    const cond = iId ? 'WHERE c.igreja_id=$1' : '';
    const params = iId ? [iId] : [];
    const { rows } = await query(`SELECT c.*,i.nome AS nome_igreja FROM comunicados c JOIN igrejas i ON i.id=c.igreja_id ${cond} ORDER BY c.criado_em DESC LIMIT 50`, params);
    res.json({ dados: rows });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const { titulo, mensagem, canal, agendado_para, igreja_id } = req.body;
    if (!titulo||!mensagem||!canal) return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
    const iId = req.usuario.papel==='admin_geral' ? (igreja_id||req.usuario.igreja_id) : req.usuario.igreja_id;
    const status = agendado_para ? 'agendado' : 'rascunho';
    const { rows } = await query(`INSERT INTO comunicados (igreja_id,titulo,mensagem,canal,status,agendado_para,enviado_por) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [iId,titulo,mensagem,canal,status,agendado_para||null,req.usuario.id]);

    // Simular envio imediato se não agendado
    if (!agendado_para) {
      const { rows: membros } = await query('SELECT COUNT(*) FROM membros WHERE igreja_id=$1 AND deletado_em IS NULL AND status=$2',[iId,'ativo']);
      const total = parseInt(membros[0].count);
      await query('UPDATE comunicados SET status=$1, enviado_em=NOW(), total_enviados=$2 WHERE id=$3',['enviado',total,rows[0].id]);
      rows[0].status = 'enviado'; rows[0].total_enviados = total;
    }
    res.status(201).json({ dados: rows[0] });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar };
