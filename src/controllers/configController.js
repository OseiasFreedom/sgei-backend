const { query } = require('../../config/database');

const buscar = async (req, res) => {
  try {
    const igrejaId = req.usuario.papel === 'admin_geral'
      ? (req.query.igreja_id || req.usuario.igreja_id)
      : req.usuario.igreja_id;

    const { rows } = await query(
      `SELECT c.*, i.nome AS nome_igreja, i.cidade, i.estado, i.telefone, i.email
       FROM configuracoes c
       JOIN igrejas i ON i.id = c.igreja_id
       WHERE c.igreja_id = $1`,
      [igrejaId]
    );

    if (!rows.length) {
      const ig = await query('SELECT * FROM igrejas WHERE id = $1', [igrejaId]);
      return res.json({ dados: ig.rows[0] ? { igreja_id: igrejaId, ...ig.rows[0] } : null });
    }
    res.json({ dados: rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

const salvar = async (req, res) => {
  try {
    const igrejaId = req.usuario.papel === 'admin_geral'
      ? (req.body.igreja_id || req.usuario.igreja_id)
      : req.usuario.igreja_id;

    const { logo_base64, logo_url, cor_primaria, nome_pastor, site, texto_carteirinha, texto_carta, whatsapp_admin } = req.body;

    const { rows } = await query(
      `INSERT INTO configuracoes (igreja_id, logo_base64, logo_url, cor_primaria, nome_pastor, site, texto_carteirinha, texto_carta, whatsapp_admin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (igreja_id) DO UPDATE SET
         logo_base64      = COALESCE(EXCLUDED.logo_base64, configuracoes.logo_base64),
         logo_url         = COALESCE(EXCLUDED.logo_url, configuracoes.logo_url),
         cor_primaria     = COALESCE(EXCLUDED.cor_primaria, configuracoes.cor_primaria),
         nome_pastor      = COALESCE(EXCLUDED.nome_pastor, configuracoes.nome_pastor),
         site             = COALESCE(EXCLUDED.site, configuracoes.site),
         texto_carteirinha= COALESCE(EXCLUDED.texto_carteirinha, configuracoes.texto_carteirinha),
         texto_carta      = COALESCE(EXCLUDED.texto_carta, configuracoes.texto_carta),
         whatsapp_admin   = COALESCE(EXCLUDED.whatsapp_admin, configuracoes.whatsapp_admin),
         atualizado_em    = NOW()
       RETURNING *`,
      [igrejaId, logo_base64 || null, logo_url || null, cor_primaria || '#0f1e3d',
       nome_pastor || null, site || null, texto_carteirinha || null, texto_carta || null,
       whatsapp_admin || null]
    );

    if (req.body.nome || req.body.telefone || req.body.email || req.body.endereco) {
      await query(
        `UPDATE igrejas SET
           nome     = COALESCE($1, nome),
           telefone = COALESCE($2, telefone),
           email    = COALESCE($3, email),
           endereco = COALESCE($4, endereco),
           cidade   = COALESCE($5, cidade),
           estado   = COALESCE($6, estado),
           logo_url = COALESCE($7, logo_url)
         WHERE id = $8`,
        [req.body.nome || null, req.body.telefone || null, req.body.email || null,
         req.body.endereco || null, req.body.cidade || null, req.body.estado || null,
         logo_base64 || logo_url || null, igrejaId]
      );
    }

    res.json({ dados: rows[0], mensagem: 'Configurações salvas!' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { buscar, salvar };
