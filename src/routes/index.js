const router = require('express').Router();
const { autenticar, exigirPapel } = require('../middlewares/auth');
const auth    = require('../controllers/authController');
const igrejas = require('../controllers/igrejasController');
const membros = require('../controllers/membrosController');
const fin     = require('../controllers/financeiroController');
const eventos = require('../controllers/eventosController');
const docs    = require('../controllers/documentosController');
const comun   = require('../controllers/comunicadosController');
const config  = require('../controllers/configController');
const admin   = require('../controllers/adminController');

router.post('/auth/login',              auth.login);
router.post('/auth/registrar',          auth.registrar);
router.get ('/auth/me',                 autenticar, auth.me);
router.post('/auth/admin',              autenticar, exigirPapel('admin_geral'), auth.criarAdmin);
router.post('/auth/esqueci-senha',      auth.forgotPassword);
router.post('/auth/redefinir-senha',    auth.resetPassword);
router.post('/auth/completar-perfil',   autenticar, auth.completarPerfil);

router.get ('/igrejas',               igrejas.listar);
router.get ('/igrejas/saldo',         autenticar, exigirPapel('admin_geral'), igrejas.saldoGeral);
router.get ('/igrejas/:id',           autenticar, igrejas.buscar);
router.post('/igrejas',               autenticar, exigirPapel('admin_geral'), igrejas.criar);
router.put ('/igrejas/:id',           autenticar, exigirPapel('admin_geral'), igrejas.atualizar);
router.get ('/igrejas/:id/saldo',     autenticar, igrejas.saldo);

router.get   ('/membros',             autenticar, exigirPapel('admin_geral','admin_congregacao'), membros.listar);
router.get   ('/membros/:id',         autenticar, exigirPapel('admin_geral','admin_congregacao'), membros.buscar);
router.post  ('/membros',             autenticar, exigirPapel('admin_geral','admin_congregacao'), membros.criar);
router.put   ('/membros/:id',         autenticar, exigirPapel('admin_geral','admin_congregacao'), membros.atualizar);
router.delete('/membros/:id',         autenticar, exigirPapel('admin_geral','admin_congregacao'), membros.deletar);
router.post  ('/membros/:id/restaurar',autenticar,exigirPapel('admin_geral'), membros.restaurar);

router.get   ('/financeiro',              autenticar, exigirPapel('admin_geral','admin_congregacao'), fin.listar);
router.post  ('/financeiro',              autenticar, exigirPapel('admin_geral','admin_congregacao'), fin.criar);
router.delete('/financeiro/:id',          autenticar, exigirPapel('admin_geral','admin_congregacao'), fin.deletar);
router.get   ('/financeiro/categorias',   autenticar, fin.categorias);
router.get   ('/financeiro/dashboard',    autenticar, exigirPapel('admin_geral','admin_congregacao'), fin.dashboard);

router.get   ('/eventos',      autenticar, eventos.listar);
router.post  ('/eventos',      autenticar, exigirPapel('admin_geral','admin_congregacao'), eventos.criar);
router.put   ('/eventos/:id',  autenticar, exigirPapel('admin_geral','admin_congregacao'), eventos.atualizar);
router.delete('/eventos/:id',  autenticar, exigirPapel('admin_geral','admin_congregacao'), eventos.deletar);

router.get ('/carteirinhas',  autenticar, exigirPapel('admin_geral','admin_congregacao'), docs.listarCarteirinhas);
router.post('/carteirinhas',  autenticar, exigirPapel('admin_geral','admin_congregacao'), docs.emitirCarteirinha);
router.get ('/cartas',        autenticar, exigirPapel('admin_geral','admin_congregacao'), docs.listarCartas);
router.post('/cartas',        autenticar, exigirPapel('admin_geral','admin_congregacao'), docs.emitirCarta);

router.get ('/comunicados',   autenticar, exigirPapel('admin_geral','admin_congregacao'), comun.listar);
router.post('/comunicados',   autenticar, exigirPapel('admin_geral','admin_congregacao'), comun.criar);

router.get('/admin/dashboard',       autenticar, exigirPapel('admin_geral'), admin.dashboardGeral);
router.get('/admin/dashboard-local', autenticar, exigirPapel('admin_congregacao'), admin.dashboardCongregacao);
router.get('/admin/deletados',       autenticar, exigirPapel('admin_geral'), admin.itensDeletados);
router.get('/admin/logs',            autenticar, exigirPapel('admin_geral'), admin.logs);

router.get("/configuracoes",  autenticar, exigirPapel("admin_geral","admin_congregacao"), config.buscar);
router.post("/configuracoes", autenticar, exigirPapel("admin_geral","admin_congregacao"), config.salvar);

module.exports = router;
