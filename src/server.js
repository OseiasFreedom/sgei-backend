require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const routes     = require('./routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', rateLimit({ windowMs: 15*60*1000, max: 500, message: { erro: 'Muitas requisições' } }));
app.use('/api', routes);
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.use((_, res) => res.status(404).json({ erro: 'Rota não encontrada' }));
app.use((err, _, res, __) => { console.error(err); res.status(500).json({ erro: 'Erro interno' }); });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`\n🕊️  SGEI Backend rodando em http://localhost:${PORT}\n`));
