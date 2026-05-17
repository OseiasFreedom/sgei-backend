const { query } = require('../../config/database');
const { v4: uuid } = require('uuid');

const buildFiltro = (req) => {
  const conds = ['m.deletado_em IS NULL'];
  const params = [];
  let i = 1;
  if (req.usuario.papel !== 'admin_geral') { conds.push(`m.igreja_id=$${i++}`); params.push(req.usuario.igreja_id); }
  else if (req.query.igreja_id) { conds.push(`m.igreja_id=$${i++}`); params.push(req.query.igreja_id); }
  if (req.query.status) { conds.push(`m.status=$${i++}`); params.push(req.query.status); }
  if (req.query.busca) { conds.push(`(m.nome_completo ILIKE $${i} OR m.cpf ILIKE $${i} OR m.telefone ILIKE $${i})`); params.push(`%${req.query.busca}%`); i++; }
  return { where: conds.join(' AND '), params };
};

const listar = async (req, res) => {
  try {
    const { where, params } = buildFiltro(req);
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20;
    const offset = (page-1)*limit;
    const { rows } = await query(`SELECT m.*,i.nome AS nome_igreja FROM membros m JOIN igrejas i ON i.id=m.igreja_id WHERE ${where} ORDER BY m.nome_completo LIMIT ${limit} OFFSET ${offset}`, params);
    const tot = await query(`SELECT COUNT(*) FROM membros m WHERE ${where}`, params);
    res.json({ dados: rows, total: parseInt(tot.rows[0].count), page, limit });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const buscar = async (req, res) => {
  try {
    const { rows } = await query(`SELECT m.*,i.nome AS nome_igreja,i.logo_url FROM membros m JOIN igrejas i ON i.id=m.igreja_id WHERE m.id=$1 AND m.deletado_em IS NULL`,[req.params.id]);
    if (!rows.length) return res.status(404).json({ erro: 'Membro não encontrado' });
    if (req.usuario.papel==='admin_congregacao' && rows[0].igreja_id!==req.usuario.igreja_id)
      return res.status(403).json({ erro: 'Acesso negado' });
    res.json({ dados: rows[0] });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const criar = async (req, res) => {
  try {
    const f = req.body;
    const igrejaId = req.usuario.papel==='admin_geral' ? f.igreja_id : req.usuario.igreja_id;
    if (!f.nome_completo||!igrejaId) return res.status(400).json({ erro: 'nome_completo e igreja_id obrigatórios' });
    const { rows } = await query(`INSERT INTO membros (id,igreja_id,usuario_id,nome_completo,data_nascimento,cpf,rg,telefone,telefone2,email,endereco,bairro,cidade,estado,cep,foto_url,estado_civil,profissao,escolaridade,data_batismo,data_membro,funcao_ministerial,observacoes,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) RETURNING *`,
      [uuid(),igrejaId,f.usuario_id||null,f.nome_completo,f.data_nascimento||null,f.cpf||null,f.rg||null,f.telefone||null,f.telefone2||null,f.email||null,f.endereco||null,f.bairro||null,f.cidade||null,f.estado||null,f.cep||null,f.foto_url||null,f.estado_civil||null,f.profissao||null,f.escolaridade||null,f.data_batismo||null,f.data_membro||null,f.funcao_ministerial||null,f.observacoes||null,f.status||'ativo']);
    res.status(201).json({ dados: rows[0] });
  } catch (e) {
    if (e.code==='23505') return res.status(409).json({ erro: 'CPF já cadastrado' });
    console.error(e); res.status(500).json({ erro: 'Erro interno' });
  }
};

const atualizar = async (req, res) => {
  try {
    const f = req.body;
    const { rows } = await query(`UPDATE membros SET nome_completo=COALESCE($1,nome_completo),data_nascimento=COALESCE($2,data_nascimento),cpf=COALESCE($3,cpf),rg=COALESCE($4,rg),telefone=COALESCE($5,telefone),telefone2=COALESCE($6,telefone2),email=COALESCE($7,email),endereco=COALESCE($8,endereco),bairro=COALESCE($9,bairro),cidade=COALESCE($10,cidade),estado=COALESCE($11,estado),cep=COALESCE($12,cep),foto_url=COALESCE($13,foto_url),estado_civil=COALESCE($14,estado_civil),profissao=COALESCE($15,profissao),escolaridade=COALESCE($16,escolaridade),data_batismo=COALESCE($17,data_batismo),data_membro=COALESCE($18,data_membro),funcao_ministerial=COALESCE($19,funcao_ministerial),observacoes=COALESCE($20,observacoes),status=COALESCE($21,status) WHERE id=$22 AND deletado_em IS NULL RETURNING *`,
      [f.nome_completo,f.data_nascimento,f.cpf,f.rg,f.telefone,f.telefone2,f.email,f.endereco,f.bairro,f.cidade,f.estado,f.cep,f.foto_url,f.estado_civil,f.profissao,f.escolaridade,f.data_batismo,f.data_membro,f.funcao_ministerial,f.observacoes,f.status,req.params.id]);
    if (!rows.length) return res.status(404).json({ erro: 'Membro não encontrado' });
    res.json({ dados: rows[0] });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const deletar = async (req, res) => {
  try {
    const { rows } = await query(`UPDATE membros SET deletado_em=NOW() WHERE id=$1 AND deletado_em IS NULL RETURNING id`,[req.params.id]);
    if (!rows.length) return res.status(404).json({ erro: 'Membro não encontrado' });
    res.json({ mensagem: 'Membro removido (soft delete)' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const restaurar = async (req, res) => {
  try {
    const { rows } = await query(`UPDATE membros SET deletado_em=NULL WHERE id=$1 RETURNING id`,[req.params.id]);
    if (!rows.length) return res.status(404).json({ erro: 'Membro não encontrado' });
    res.json({ mensagem: 'Membro restaurado' });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { listar, buscar, criar, atualizar, deletar, restaurar };
