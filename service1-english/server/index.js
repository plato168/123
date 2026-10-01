require('dotenv').config();
const path = require('path');
const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.use(express.json({ limit: '50kb' }));

const MOBILE_UA = /Android|iPhone|iPod|IEMobile|Opera Mini|Mobile|BlackBerry|webOS/i;

// Root entry: send phones to the mobile site, everyone else to the desktop site.
// ?view=web or ?view=mobile forces a version.
app.get('/', (req, res) => {
  const view = req.query.view;
  const isMobile = view ? view === 'mobile' : MOBILE_UA.test(req.get('user-agent') || '');
  res.redirect(302, isMobile ? '/m/' : '/web/');
});

app.use('/shared', express.static(path.join(PUBLIC_DIR, 'shared')));
app.use('/web', express.static(path.join(PUBLIC_DIR, 'web')));
app.use('/m', express.static(path.join(PUBLIC_DIR, 'mobile')));

// ---------- API ----------
const api = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

async function one(res, sql, params) {
  const { rows } = await db.query(sql, params);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
}

api.get('/health', wrap(async (req, res) => {
  await db.query('SELECT 1');
  res.json({ ok: true });
}));

api.get('/site', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT key, value FROM site_settings');
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}));

api.get('/pages/:slug', wrap((req, res) =>
  one(res, 'SELECT slug, title, summary, body, updated_at FROM pages WHERE slug = $1', [req.params.slug])));

api.get('/milestones', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT year, description FROM milestones ORDER BY year');
  res.json(rows);
}));

api.get('/services', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT slug, name, icon, summary FROM services ORDER BY sort_order, id');
  res.json(rows);
}));

api.get('/services/:slug', wrap((req, res) =>
  one(res, 'SELECT slug, name, icon, summary, body FROM services WHERE slug = $1', [req.params.slug])));

api.get('/categories', wrap(async (req, res) => {
  const { rows } = await db.query(
    `SELECT c.slug, c.name, COUNT(p.id)::int AS product_count
       FROM product_categories c LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id ORDER BY c.sort_order, c.id`);
  res.json(rows);
}));

api.get('/products', wrap(async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.category) {
    params.push(req.query.category);
    where = 'WHERE c.slug = $1';
  }
  const { rows } = await db.query(
    `SELECT p.slug, p.name, p.model_no, p.summary, c.slug AS category, c.name AS category_name
       FROM products p JOIN product_categories c ON c.id = p.category_id
       ${where} ORDER BY c.sort_order, p.sort_order, p.id`, params);
  res.json(rows);
}));

api.get('/products/:slug', wrap((req, res) =>
  one(res,
    `SELECT p.slug, p.name, p.model_no, p.summary, p.body, p.specs, c.slug AS category, c.name AS category_name
       FROM products p JOIN product_categories c ON c.id = p.category_id WHERE p.slug = $1`,
    [req.params.slug])));

api.get('/news', wrap(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const { rows } = await db.query(
    `SELECT slug, title, summary, to_char(published_at, 'YYYY-MM-DD') AS date
       FROM news ORDER BY published_at DESC, id DESC LIMIT $1`, [limit]);
  res.json(rows);
}));

api.get('/news/:slug', wrap((req, res) =>
  one(res,
    `SELECT slug, title, summary, body, to_char(published_at, 'YYYY-MM-DD') AS date FROM news WHERE slug = $1`,
    [req.params.slug])));

api.get('/faqs', wrap(async (req, res) => {
  const { rows } = await db.query('SELECT question, answer FROM faqs ORDER BY sort_order, id');
  res.json(rows);
}));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

api.post('/contact', wrap(async (req, res) => {
  const b = req.body || {};
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const data = {
    name: str(b.name, 120),
    email: str(b.email, 200),
    company: str(b.company, 200),
    phone: str(b.phone, 60),
    subject: str(b.subject, 200),
    message: str(b.message, 5000),
    source: b.source === 'mobile' ? 'mobile' : 'web',
  };
  const errors = [];
  if (!data.name) errors.push('Name is required.');
  if (!EMAIL_RE.test(data.email)) errors.push('A valid email is required.');
  if (!data.message) errors.push('Message is required.');
  if (errors.length) return res.status(400).json({ errors });

  const { rows } = await db.query(
    `INSERT INTO inquiries (name, email, company, phone, subject, message, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [data.name, data.email, data.company || null, data.phone || null, data.subject || null, data.message, data.source]);
  res.status(201).json({ ok: true, id: rows[0].id });
}));

api.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use('/api', api);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`  Desktop: http://localhost:${PORT}/web/`);
  console.log(`  Mobile:  http://localhost:${PORT}/m/`);
});
