'use strict';
// 整合測試：需要已執行 npm run setup 的 PostgreSQL（DATABASE_URL）
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/server');
const { pool } = require('../src/db');

let base;
let server;
const username = `t_${Date.now().toString(36)}`;

test.before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await pool.query('DELETE FROM users WHERE username LIKE $1', [`${username}%`]);
  server.close();
  await pool.end();
});

function client() {
  let cookie = '';
  return async (path, body, method = body ? 'POST' : 'GET') => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  };
}

test('每科都有 1000 題', async () => {
  const { rows } = await pool.query(
    'SELECT s.code, count(q.id)::int AS n FROM subjects s JOIN questions q ON q.subject_id = s.id GROUP BY s.code');
  assert.strictEqual(rows.length, 6);
  for (const r of rows) assert.strictEqual(r.n, 1000, r.code);
});

test('註冊、登入、驗證錯誤', async () => {
  const c = client();
  assert.strictEqual((await c('/api/subjects')).status, 401);
  assert.strictEqual((await c('/api/register', { username: 'x', password: '123456', displayName: 'a', grade: 3 })).status, 400);
  const reg = await c('/api/register', { username, password: 'secret123', displayName: '小明', grade: 3 });
  assert.strictEqual(reg.status, 201);
  assert.strictEqual((await c('/api/register', { username, password: 'secret123', displayName: '小明', grade: 3 })).status, 409);
  const c2 = client();
  assert.strictEqual((await c2('/api/login', { username, password: 'wrong-pass' })).status, 401);
  const login = await c2('/api/login', { username, password: 'secret123' });
  assert.strictEqual(login.status, 200);
  assert.strictEqual(login.data.user.displayName, '小明');
  const report = await c2('/api/report/me');
  assert.strictEqual(report.data.summary.login_count, 2); // 註冊一次＋登入一次
  assert.strictEqual((await c2('/api/report/admin')).status, 403);
});

test('答對的題目不會再出現，全部答對後顯示完成', async () => {
  const c = client();
  const name = `${username}_q`;
  await c('/api/register', { username: name, password: 'secret123', displayName: '小華', grade: 4 });
  const { rows: [u] } = await pool.query('SELECT id FROM users WHERE username = $1', [name]);
  // 先把數學科除了 2 題以外都標成已答對
  const { rows: keep } = await pool.query(
    `SELECT q.id, q.answer FROM questions q JOIN subjects s ON s.id = q.subject_id
      WHERE s.code = 'math' ORDER BY q.id LIMIT 2`);
  await pool.query(
    `INSERT INTO mastered (user_id, question_id)
     SELECT $1, q.id FROM questions q JOIN subjects s ON s.id = q.subject_id
      WHERE s.code = 'math' AND q.id <> ALL($2::int[])`, [u.id, keep.map((k) => k.id)]);

  const answerOf = new Map(keep.map((k) => [k.id, k.answer]));
  const first = await c('/api/quiz/math/next');
  assert.ok(answerOf.has(first.data.question.id));
  assert.strictEqual(first.data.question.answer, undefined, '不能把答案傳給前端');

  // 答錯：題目仍在題池中
  const wrongChoice = (answerOf.get(first.data.question.id) + 1) % first.data.question.choices.length;
  const wrong = await c('/api/quiz/answer', { questionId: first.data.question.id, choice: wrongChoice });
  assert.strictEqual(wrong.data.correct, false);
  assert.strictEqual(wrong.data.progress.mastered, 998);

  // 答對兩題
  for (const id of answerOf.keys()) {
    const res = await c('/api/quiz/answer', { questionId: id, choice: answerOf.get(id) });
    assert.strictEqual(res.data.correct, true);
  }
  for (let i = 0; i < 5; i++) {
    const n = await c('/api/quiz/math/next');
    assert.strictEqual(n.data.done, true);
    assert.strictEqual(n.data.progress.mastered, 1000);
  }
  const report = await c('/api/report/me');
  const math = report.data.subjects.find((s) => s.code === 'math');
  assert.deepStrictEqual([math.mastered, math.attempts, math.correct], [1000, 3, 2]);
});

test('管理者報告與 CSV', async () => {
  const c = client();
  const name = `${username}_admin`;
  await c('/api/register', { username: name, password: 'secret123', displayName: '王老師', grade: 6 });
  await pool.query("UPDATE users SET role = 'admin' WHERE username = $1", [name]);
  const r = await c('/api/report/admin');
  assert.strictEqual(r.status, 200);
  assert.ok(r.data.students.some((s) => s.username === name));
  assert.strictEqual(r.data.subjects.length, 6);
  const csv = await c('/api/report/admin.csv');
  assert.strictEqual(csv.status, 200);
  assert.match(csv.data, /帳號,暱稱,年級/);
  const g6 = await c('/api/report/admin?grade=6');
  assert.ok(g6.data.students.every((s) => s.grade === 6));
});
