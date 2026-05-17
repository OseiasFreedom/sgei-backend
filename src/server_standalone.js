/**
 * SGEI — Servidor Standalone (Desktop Mode)
 * Serve o frontend React + API no mesmo processo.
 * O usuário abre o .bat e acessa http://localhost:3001
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const path      = require('path');
const fs        = require('fs');
const routes    = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3001;
const DIST = path.join(__dirname, '..', 'public');   // pasta com o build do React

// ─── Segurança básica ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // React precisa de scripts inline em dev
}));
app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── API ──────────────────────────────────────────────────────
app.use('/api', routes);
app.get('/health', (_, res) => res.json({ status: 'ok', mode: 'standalone', ts: new Date().toISOString() }));

// ─── Servir o frontend React (build estático) ─────────────────
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ erro: 'Rota não encontrada' });
    res.sendFile(path.join(DIST, 'index.html'));
  });
} else {
  app.get('/', (_, res) => res.send('<h2>SGEI</h2><p>Frontend não encontrado em /public. Execute o build primeiro.</p>'));
}

// ─── Iniciar ──────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🕊️  SGEI rodando em ${url}\n`);

  // Abrir no navegador automaticamente (Windows/Mac/Linux)
  const start = process.platform === 'win32' ? 'start'
              : process.platform === 'darwin' ? 'open' : 'xdg-open';
  require('child_process').exec(`${start} ${url}`, () => {});
});
