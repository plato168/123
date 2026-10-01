// Creates tables and loads seed data. Use --reset to drop all tables first.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../server/db');

const TABLES = ['inquiries', 'faqs', 'news', 'products', 'product_categories', 'services', 'milestones', 'pages', 'site_settings'];

(async () => {
  const dir = path.join(__dirname, '..', 'db');
  try {
    if (process.argv.includes('--reset')) {
      await pool.query(`DROP TABLE IF EXISTS ${TABLES.join(', ')} CASCADE`);
      console.log('Dropped existing tables.');
    }
    await pool.query(fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8'));
    console.log('Schema applied.');
    await pool.query(fs.readFileSync(path.join(dir, 'seed.sql'), 'utf8'));
    console.log('Seed data loaded.');
  } catch (err) {
    console.error('Database init failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
