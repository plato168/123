'use strict';
// 建立資料表與報告檢視表（可重複執行）
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('資料庫結構建立完成');
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
