// src/routes/usuarios.js
// Adicione este arquivo em src/routes/ e importe no server.js/app.js

const express = require('express');
const router = express.Router();
const { autenticar, exigirAdmin } = require('../middleware/auth'); // ajuste o caminho se necessário
const {
  listarUsuarios,
  obterUsuario,
  editarUsuario,
  toggleAtivo,
  deletarUsuario,
} = require('../controllers/usuariosController');

// Todas as rotas exigem autenticação + papel admin
router.get('/',           autenticar, exigirAdmin, listarUsuarios);
router.get('/:id',        autenticar, exigirAdmin, obterUsuario);
router.put('/:id',        autenticar, exigirAdmin, editarUsuario);
router.patch('/:id/toggle', autenticar, exigirAdmin, toggleAtivo);
router.delete('/:id',     autenticar, exigirAdmin, deletarUsuario);

module.exports = router;

// ─────────────────────────────────────────────────
// No seu server.js ou app.js, adicione:
//
// const usuariosRoutes = require('./routes/usuarios');
// app.use('/usuarios', usuariosRoutes);
// ─────────────────────────────────────────────────
