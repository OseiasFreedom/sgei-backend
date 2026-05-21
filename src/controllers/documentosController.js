const { query } = require('../../config/database');

const gerarNumero = (sigla) => {
  const ano = new Date().getFullYear();
  const seq = Math.floor(Math.random()*9000)+1000;
  return `${sigla}-${ano}-${seq}`;
};

const emitirCarteirinha = async (req, res) => {
  try {
    const { membro_id, validade_anos = 2 } = req.body;
    const { rows: m } = await query(
      `SELECT mem.*,i.nome AS nome_igreja,i.sigla FROM membros mem JOIN igrejas i ON i.id=mem.igreja_id WHERE mem.id=$1 AND mem.deletado_em IS NULL`,
      [membro_id]
    );
    if (!m.length) return res.status(404).json({ erro: 'Membro não encontrado' });
    const membro = m[0];

    // Bloqueia duplicata: verifica se já existe carteirinha ativa para este membro
    const { rows: dup } = await query(
      `SELECT id FROM carteirinhas WHERE membro_id=$1 AND status='ativa'`,
      [membro_id]
    );
    if (dup.length) return res.status(409).json({ erro: `${membro.nome_completo} já possui uma carteirinha ativa. Cancele a anterior antes de emitir uma nova.` });

    const numero = gerarNumero(membro.sigla||'IG');
    const validade = new Date(); validade.setFullYear(validade.getFullYear()+validade_anos);
    const { rows } = await query(
      `INSERT INTO carteirinhas (membro_id,numero_cartao,data_emissao,data_validade,status,emitida_por) VALUES ($1,$2,CURRENT_DATE,$3,'ativa',$4) RETURNING *`,
      [membro_id, numero, validade.toISOString().split('T')[0], req.usuario.id]
    );
    res.status(201).json({ dados: { ...rows[0], membro } });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const listarCarteirinhas = async (req, res) => {
  try {
    const iId = req.usuario.papel==='admin_geral' ? req.query.igreja_id : req.usuario.igreja_id;
    const cond = iId ? 'AND m.igreja_id=$1' : '';
    const params = iId ? [iId] : [];
    const { rows } = await query(
      `SELECT c.*,m.nome_completo,m.foto_url,i.nome AS nome_igreja FROM carteirinhas c JOIN membros m ON m.id=c.membro_id JOIN igrejas i ON i.id=m.igreja_id WHERE 1=1 ${cond} ORDER BY c.criado_em DESC`,
      params
    );
    res.json({ dados: rows });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const atualizarCarteirinha = async (req, res) => {
  try {
    const { status } = req.body;
    const statusValidos = ['ativa', 'cancelada', 'vencida'];
    if (!statusValidos.includes(status)) return res.status(400).json({ erro: 'Status inválido' });
    const { rows } = await query(
      `UPDATE carteirinhas SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Carteirinha não encontrada' });
    res.json({ dados: rows[0], mensagem: 'Carteirinha atualizada!' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const deletarCarteirinha = async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM carteirinhas WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Carteirinha não encontrada' });
    res.json({ mensagem: 'Carteirinha removida com sucesso!' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const emitirCarta = async (req, res) => {
  try {
    const { membro_id, destino_nome, destino_pastor, observacoes } = req.body;
    const { rows: m } = await query(
      `SELECT mem.*,i.nome AS nome_igreja,i.cidade,i.estado FROM membros mem JOIN igrejas i ON i.id=mem.igreja_id WHERE mem.id=$1`,
      [membro_id]
    );
    if (!m.length) return res.status(404).json({ erro: 'Membro não encontrado' });
    const { rows } = await query(
      `INSERT INTO cartas_recomendacao (membro_id,destino_nome,destino_pastor,observacoes,emitida_por) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [membro_id, destino_nome||null, destino_pastor||null, observacoes||null, req.usuario.id]
    );
    res.status(201).json({ dados: { ...rows[0], membro: m[0] } });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const listarCartas = async (req, res) => {
  try {
    const iId = req.usuario.papel==='admin_geral' ? req.query.igreja_id : req.usuario.igreja_id;
    const cond = iId ? 'AND m.igreja_id=$1' : '';
    const params = iId ? [iId] : [];
    const { rows } = await query(
      `SELECT cr.*,m.nome_completo FROM cartas_recomendacao cr JOIN membros m ON m.id=cr.membro_id WHERE 1=1 ${cond} ORDER BY cr.criado_em DESC`,
      params
    );
    res.json({ dados: rows });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
};

const deletarCarta = async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM cartas_recomendacao WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Carta não encontrada' });
    res.json({ mensagem: 'Carta removida com sucesso!' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { emitirCarteirinha, listarCarteirinhas, atualizarCarteirinha, deletarCarteirinha, emitirCarta, listarCartas, deletarCarta };
