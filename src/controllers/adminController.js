const { query } = require('../../config/database');

const itensDeletados = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM vw_itens_deletados ORDER BY deletado_em DESC');
    res.json({ dados: rows });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const logs = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM logs_auditoria ORDER BY criado_em DESC LIMIT 200');
    res.json({ dados: rows });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const dashboardGeral = async (req, res) => {
  try {
    const { rows: totais } = await query(`SELECT (SELECT COUNT(*) FROM membros WHERE deletado_em IS NULL AND status='ativo') AS total_membros,(SELECT COUNT(*) FROM igrejas WHERE ativa=TRUE) AS total_igrejas,(SELECT COALESCE(SUM(valor),0) FROM lancamentos_financeiros WHERE tipo='entrada' AND deletado_em IS NULL AND referencia_mes=to_char(NOW(),'YYYY-MM')) AS entradas_mes,(SELECT COALESCE(SUM(valor),0) FROM lancamentos_financeiros WHERE tipo='saida' AND deletado_em IS NULL AND referencia_mes=to_char(NOW(),'YYYY-MM')) AS saidas_mes`);
    const { rows: igrejas } = await query('SELECT * FROM vw_saldo_igrejas ORDER BY tipo,nome');
    const { rows: eventosProx } = await query(`SELECT e.*,i.nome AS nome_igreja FROM eventos e JOIN igrejas i ON i.id=e.igreja_id WHERE e.deletado_em IS NULL AND e.data_inicio>=NOW() ORDER BY e.data_inicio LIMIT 10`);
    const { rows: membrosRecentes } = await query(`SELECT m.*,i.nome AS nome_igreja FROM membros m JOIN igrejas i ON i.id=m.igreja_id WHERE m.deletado_em IS NULL ORDER BY m.criado_em DESC LIMIT 8`);
    res.json({ totais: totais[0], igrejas, eventos: eventosProx, membros_recentes: membrosRecentes });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const dashboardCongregacao = async (req, res) => {
  try {
    const iId = req.usuario.igreja_id;
    const { rows: totais } = await query(`SELECT (SELECT COUNT(*) FROM membros WHERE igreja_id=$1 AND deletado_em IS NULL AND status='ativo') AS total_membros,(SELECT COALESCE(SUM(valor),0) FROM lancamentos_financeiros WHERE igreja_id=$1 AND tipo='entrada' AND deletado_em IS NULL AND referencia_mes=to_char(NOW(),'YYYY-MM')) AS entradas_mes,(SELECT COALESCE(SUM(valor),0) FROM lancamentos_financeiros WHERE igreja_id=$1 AND tipo='saida' AND deletado_em IS NULL AND referencia_mes=to_char(NOW(),'YYYY-MM')) AS saidas_mes`,[iId]);
    const { rows: lancamentos } = await query(`SELECT l.*,c.nome AS categoria_nome FROM lancamentos_financeiros l LEFT JOIN financeiro_categorias c ON c.id=l.categoria_id WHERE l.igreja_id=$1 AND l.deletado_em IS NULL ORDER BY l.data_lancamento DESC LIMIT 5`,[iId]);
    const { rows: eventos } = await query(`SELECT * FROM eventos WHERE (escopo='geral' OR igreja_id=$1) AND deletado_em IS NULL AND data_inicio>=NOW() ORDER BY data_inicio LIMIT 5`,[iId]);
    const { rows: membros } = await query(`SELECT * FROM membros WHERE igreja_id=$1 AND deletado_em IS NULL ORDER BY criado_em DESC LIMIT 5`,[iId]);
    res.json({ totais: totais[0], lancamentos, eventos, membros_recentes: membros });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { itensDeletados, logs, dashboardGeral, dashboardCongregacao };
