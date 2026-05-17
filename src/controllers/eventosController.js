const { query } = require('../../config/database');

const listar = async (req, res) => {
  try {
    const conds = ['e.deletado_em IS NULL'];
    const params = [];
    let i = 1;
    // Membros e admins veem eventos gerais + da sua igreja
    if (req.usuario.papel==='membro'||req.usuario.papel==='admin_congregacao') {
      conds.push(`(e.escopo='geral' OR e.igreja_id=$${i++})`);
      params.push(req.usuario.igreja_id);
    } else if (req.query.igreja_id) { conds.push(`e.igreja_id=$${i++}`); params.push(req.query.igreja_id); }
    if (req.query.de) { conds.push(`e.data_inicio>=$${i++}`); params.push(req.query.de); }
    if (req.query.ate) { conds.push(`e.data_inicio<=$${i++}`); params.push(req.query.ate); }
    const { rows } = await query(`SELECT e.*,i.nome AS nome_igreja FROM eventos e JOIN igrejas i ON i.id=e.igreja_id WHERE ${conds.join(' AND ')} ORDER BY e.data_inicio`, params);
    res.json({ dados: rows });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const { titulo,descricao,data_inicio,data_fim,local,escopo,bloqueio_data,cor,igreja_id } = req.body;
    if (!titulo||!data_inicio) return res.status(400).json({ erro: 'Título e data obrigatórios' });
    const iId = req.usuario.papel==='admin_geral' ? (igreja_id||req.usuario.igreja_id) : req.usuario.igreja_id;
    // Somente admin_geral pode criar escopo geral ou bloqueio
    const escopoFinal = req.usuario.papel==='admin_geral' ? (escopo||'local') : 'local';
    const bloqFinal = req.usuario.papel==='admin_geral' ? (bloqueio_data||false) : false;
    // Verificar conflito com datas bloqueadas pela sede
    if (escopoFinal==='local') {
      const { rows: bloq } = await query(`SELECT id FROM eventos WHERE deletado_em IS NULL AND bloqueio_data=TRUE AND DATE(data_inicio)=DATE($1)`,[data_inicio]);
      if (bloq.length) return res.status(409).json({ erro: 'Data bloqueada pela Sede para evento geral' });
    }
    const { rows } = await query(`INSERT INTO eventos (igreja_id,titulo,descricao,data_inicio,data_fim,local,escopo,bloqueio_data,cor,criado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [iId,titulo,descricao||null,data_inicio,data_fim||null,local||null,escopoFinal,bloqFinal,cor||'#185FA5',req.usuario.id]);
    res.status(201).json({ dados: rows[0] });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const { titulo,descricao,data_inicio,data_fim,local,cor } = req.body;
    const { rows } = await query(`UPDATE eventos SET titulo=COALESCE($1,titulo),descricao=COALESCE($2,descricao),data_inicio=COALESCE($3,data_inicio),data_fim=COALESCE($4,data_fim),local=COALESCE($5,local),cor=COALESCE($6,cor) WHERE id=$7 AND deletado_em IS NULL RETURNING *`,
      [titulo,descricao,data_inicio,data_fim,local,cor,req.params.id]);
    if (!rows.length) return res.status(404).json({ erro: 'Evento não encontrado' });
    res.json({ dados: rows[0] });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const deletar = async (req, res) => {
  try {
    await query('UPDATE eventos SET deletado_em=NOW() WHERE id=$1',[req.params.id]);
    res.json({ mensagem: 'Evento removido' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, atualizar, deletar };
