const { query } = require('../../config/database');

const listar = async (req, res) => {
  try {
    const { rows } = await query(`SELECT i.*,s.nome AS nome_sede,COUNT(DISTINCT m.id) FILTER(WHERE m.deletado_em IS NULL) AS total_membros FROM igrejas i LEFT JOIN igrejas s ON s.id=i.sede_id LEFT JOIN membros m ON m.igreja_id=i.id WHERE i.ativa=TRUE GROUP BY i.id,s.nome ORDER BY i.tipo,i.nome`);
    res.json({ dados: rows });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const buscar = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM igrejas WHERE id=$1',[req.params.id]);
    if (!rows.length) return res.status(404).json({ erro: 'Igreja não encontrada' });
    res.json({ dados: rows[0] });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const { nome,tipo,sede_id,endereco,cidade,estado,telefone,email,logo_url } = req.body;
    if (!nome||!tipo) return res.status(400).json({ erro: 'Nome e tipo obrigatórios' });
    const { rows } = await query(`INSERT INTO igrejas (nome,tipo,sede_id,endereco,cidade,estado,telefone,email,logo_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[nome,tipo,sede_id||null,endereco,cidade,estado,telefone,email,logo_url]);
    res.status(201).json({ dados: rows[0] });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizar = async (req, res) => {
  try {
    const { nome,endereco,cidade,estado,telefone,email,logo_url,ativa } = req.body;
    const { rows } = await query(`UPDATE igrejas SET nome=COALESCE($1,nome),endereco=COALESCE($2,endereco),cidade=COALESCE($3,cidade),estado=COALESCE($4,estado),telefone=COALESCE($5,telefone),email=COALESCE($6,email),logo_url=COALESCE($7,logo_url),ativa=COALESCE($8,ativa) WHERE id=$9 RETURNING *`,[nome,endereco,cidade,estado,telefone,email,logo_url,ativa,req.params.id]);
    if (!rows.length) return res.status(404).json({ erro: 'Igreja não encontrada' });
    res.json({ dados: rows[0] });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const saldo = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM vw_saldo_igrejas WHERE id=$1',[req.params.id]);
    res.json({ dados: rows[0] || null });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const saldoGeral = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM vw_saldo_igrejas ORDER BY tipo,nome');
    const totais = rows.reduce((a,r)=>({ entradas: a.entradas+Number(r.total_entradas), saidas: a.saidas+Number(r.total_saidas), membros: a.membros+Number(r.total_membros) }),{entradas:0,saidas:0,membros:0});
    res.json({ dados: rows, totais });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, buscar, criar, atualizar, saldo, saldoGeral };
