const { query } = require('../../config/database');

const listar = async (req, res) => {
  try {
    const conds = ['l.deletado_em IS NULL'];
    const params = [];
    let i = 1;
    if (req.usuario.papel!=='admin_geral') { conds.push(`l.igreja_id=$${i++}`); params.push(req.usuario.igreja_id); }
    else if (req.query.igreja_id) { conds.push(`l.igreja_id=$${i++}`); params.push(req.query.igreja_id); }
    if (req.query.tipo) { conds.push(`l.tipo=$${i++}`); params.push(req.query.tipo); }
    if (req.query.mes) { conds.push(`l.referencia_mes=$${i++}`); params.push(req.query.mes); }
    const where = conds.join(' AND ');
    const { rows } = await query(`SELECT l.*,c.nome AS categoria_nome,i.nome AS nome_igreja FROM lancamentos_financeiros l LEFT JOIN financeiro_categorias c ON c.id=l.categoria_id JOIN igrejas i ON i.id=l.igreja_id WHERE ${where} ORDER BY l.data_lancamento DESC LIMIT 100`, params);
    res.json({ dados: rows });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const { igreja_id, categoria_id, tipo, valor, descricao, data_lancamento, referencia_mes } = req.body;
    const iId = req.usuario.papel==='admin_geral' ? igreja_id : req.usuario.igreja_id;
    if (!iId||!tipo||!valor||!data_lancamento) return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
    const mes = referencia_mes || data_lancamento.substring(0,7);
    const { rows } = await query(`INSERT INTO lancamentos_financeiros (igreja_id,categoria_id,tipo,valor,descricao,data_lancamento,referencia_mes,registrado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [iId,categoria_id||null,tipo,valor,descricao||null,data_lancamento,mes,req.usuario.id]);
    res.status(201).json({ dados: rows[0] });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const deletar = async (req, res) => {
  try {
    await query('UPDATE lancamentos_financeiros SET deletado_em=NOW() WHERE id=$1',[req.params.id]);
    res.json({ mensagem: 'Lançamento removido' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const categorias = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM financeiro_categorias ORDER BY tipo,nome');
    res.json({ dados: rows });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const dashboard = async (req, res) => {
  try {
    const igrejaId = req.usuario.papel==='admin_geral' ? req.query.igreja_id : req.usuario.igreja_id;
    const cond = igrejaId ? 'AND l.igreja_id=$1' : '';
    const params = igrejaId ? [igrejaId] : [];
    const { rows: mensal } = await query(`SELECT referencia_mes AS mes, SUM(valor) FILTER(WHERE tipo='entrada') AS entradas, SUM(valor) FILTER(WHERE tipo='saida') AS saidas FROM lancamentos_financeiros l WHERE deletado_em IS NULL ${cond} GROUP BY referencia_mes ORDER BY referencia_mes DESC LIMIT 12`, params);
    const { rows: categ } = await query(`SELECT c.nome,l.tipo,SUM(l.valor) AS total FROM lancamentos_financeiros l JOIN financeiro_categorias c ON c.id=l.categoria_id WHERE l.deletado_em IS NULL ${cond} AND l.referencia_mes=to_char(NOW(),'YYYY-MM') GROUP BY c.nome,l.tipo`, params);
    res.json({ mensal: mensal.reverse(), categorias: categ });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, criar, deletar, categorias, dashboard };
