'use strict';
// 將已註冊的帳號設為管理者（老師），可查看全體學生的登入與進度統計報告
// 用法：npm run make-admin -- <帳號>
const { pool } = require('../src/db');

(async () => {
  const username = process.argv[2];
  if (!username) {
    console.error('用法：npm run make-admin -- <帳號>');
    process.exit(1);
  }
  const res = await pool.query("UPDATE users SET role = 'admin' WHERE username = $1", [username]);
  console.log(res.rowCount ? `已將 ${username} 設為管理者` : `找不到帳號 ${username}`);
  await pool.end();
  if (!res.rowCount) process.exit(1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
