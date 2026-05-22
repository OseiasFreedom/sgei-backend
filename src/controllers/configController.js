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

    const {
      logo_base64, logo_url, cor_primaria, nome_pastor,
      site, texto_carteirinha, texto_carta, whatsapp_admin
    } = req.body;

    // Busca valores atuais para não perder logo se não vier no payload
    const { rows: atual } = await query('SELECT logo_base64, logo_url FROM configuracoes WHERE igreja_id=$1', [igrejaId]);
    const logoAtual = atual[0]?.logo_base64 || atual[0]?.logo_url || null;
    const logoNovo  = logo_base64 || logo_url || null;

    const { rows } = await query(
      `INSERT INTO configuracoes
         (igreja_id, logo_base64, logo_url, cor_primaria, nome_pastor, site, texto_carteirinha, texto_carta, whatsapp_admin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (igreja_id) DO UPDATE SET
         logo_base64       = CASE WHEN $2 IS NOT NULL THEN $2 ELSE configuracoes.logo_base64 END,
         logo_url          = CASE WHEN $3 IS NOT NULL THEN $3 ELSE configuracoes.logo_url END,
         cor_primaria      = COALESCE($4, configuracoes.cor_primaria),
         nome_pastor       = COALESCE($5, configuracoes.nome_pastor),
         site              = COALESCE($6, configuracoes.site),
         texto_carteirinha = COALESCE($7, configuracoes.texto_carteirinha),
         texto_carta       = COALESCE($8, configuracoes.texto_carta),
         whatsapp_admin    = $9,
         atualizado_em     = NOW()
       RETURNING *`,
      [
        igrejaId,
        logoNovo || logoAtual,
        logo_url || null,
        cor_primaria || '#0f1e3d',
        nome_pastor || null,
        site || null,
        texto_carteirinha || null,
        texto_carta || null,
        whatsapp_admin || null   // <- sem COALESCE, sempre sobrescreve
      ]
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
        [
          req.body.nome || null, req.body.telefone || null,
          req.body.email || null, req.body.endereco || null,
          req.body.cidade || null, req.body.estado || null,
          logoNovo || null, igrejaId
        ]
      );
    }

    res.json({ dados: rows[0], mensagem: 'Configurações salvas!' });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
};

module.exports = { buscar, salvar };
