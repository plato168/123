const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://service1:service1@localhost:5432/service1_english',
});

module.exports = { pool, query: (text, params) => pool.query(text, params) };
