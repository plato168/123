'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, tx } = require('./db');

const app = express();
const SESSION_DAYS = 14;
const COOKIE = 'quiz_session';
const SECURE = process.env.COOKIE_SECURE === 'true';

app.set('trust proxy', true);
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- 工具 ----------
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function setSessionCookie(res, token, maxAgeSec) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${SECURE ? '; Secure' : ''}`);
}

async function startSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [token, userId, String(SESSION_DAYS)]
  );
  await pool.query('INSERT INTO login_events (user_id, ip, user_agent) VALUES ($1, $2, $3)',
    [userId, req.ip, String(req.headers['user-agent'] || '').slice(0, 300)]);
  setSessionCookie(res, token, SESSION_DAYS * 86400);
}

// 簡單的登入失敗次數限制（每個 IP＋帳號 15 分鐘內最多 10 次）
const failures = new Map();
function tooManyFailures(key) {
  const now = Date.now();
  const list = (failures.get(key) || []).filter((t) => now - t < 15 * 60 * 1000);
  failures.set(key, list);
  return list.length >= 10;
}
function recordFailure(key) {
  failures.set(key, [...(failures.get(key) || []), Date.now()]);
}

const auth = wrap(async (req, res, next) => {
  const token = readCookie(req, COOKIE);
  if (token) {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.grade, u.role
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = $1 AND s.expires_at > now()`,
      [token]
    );
    if (rows[0]) {
      req.user = rows[0];
      return next();
    }
  }
  res.status(401).json({ error: '請先登入' });
});

const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: '只有管理者可以查看' });

const publicUser = (u) => ({ id: u.id, username: u.username, displayName: u.display_name, grade: u.grade, role: u.role });

// ---------- 帳號 ----------
app.post('/api/register', wrap(async (req, res) => {
  const { username, password, displayName, grade } = req.body || {};
  const g = Number(grade);
  if (typeof username !== 'string' || !/^[A-Za-z0-9_]{3,32}$/.test(username)) {
    return res.status(400).json({ error: '帳號需為 3～32 個英文字母、數字或底線' });
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
    return res.status(400).json({ error: '密碼長度需為 6～72 個字元' });
  }
  const name = typeof displayName === 'string' ? displayName.trim() : '';
  if (!name || name.length > 40) return res.status(400).json({ error: '請填寫暱稱（最多 40 字）' });
  if (!Number.isInteger(g) || g < 1 || g > 6) return res.status(400).json({ error: '請選擇 1～6 年級' });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (username, password_hash, display_name, grade) VALUES ($1, $2, $3, $4)
     ON CONFLICT (username) DO NOTHING
     RETURNING id, username, display_name, grade, role`,
    [username, hash, name, g]
  );
  if (!rows[0]) return res.status(409).json({ error: '這個帳號已經有人使用了' });
  await startSession(req, res, rows[0].id);
  res.status(201).json({ user: publicUser(rows[0]) });
}));

app.post('/api/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: '請輸入帳號和密碼' });
  }
  const key = `${req.ip}|${username.toLowerCase()}`;
  if (tooManyFailures(key)) return res.status(429).json({ error: '嘗試次數太多，請 15 分鐘後再試' });
  const { rows } = await pool.query(
    'SELECT id, username, display_name, grade, role, password_hash FROM users WHERE username = $1', [username]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    recordFailure(key);
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  }
  failures.delete(key);
  await startSession(req, res, user.id);
  res.json({ user: publicUser(user) });
}));

app.post('/api/logout', wrap(async (req, res) => {
  const token = readCookie(req, COOKIE);
  if (token) await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  setSessionCookie(res, '', 0);
  res.json({ ok: true });
}));

app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

// ---------- 科目與測驗 ----------
app.get('/api/subjects', auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT subject_code AS code, subject_name AS name, total_questions::int AS total, mastered::int AS mastered,
            attempts::int AS attempts, correct_attempts::int AS correct
       FROM v_student_subject_progress WHERE user_id = $1 ORDER BY sort_order`,
    [req.user.id]
  );
  res.json({ subjects: rows });
}));

async function subjectProgress(userId, code) {
  const { rows } = await pool.query(
    `SELECT total_questions::int AS total, mastered::int AS mastered
       FROM v_student_subject_progress WHERE user_id = $1 AND subject_code = $2`,
    [userId, code]
  );
  return rows[0] || null;
}

// 出下一題：只從「尚未答對」的題目中隨機挑選
app.get('/api/quiz/:code/next', auth, wrap(async (req, res) => {
  const progress = await subjectProgress(req.user.id, req.params.code);
  if (!progress) return res.status(404).json({ error: '找不到這個科目' });
  const exclude = Number.parseInt(req.query.exclude, 10) || 0;
  const pickSql = `
    SELECT q.id, q.grade, q.topic, q.stem, q.choices
      FROM questions q JOIN subjects s ON s.id = q.subject_id
     WHERE s.code = $1 AND q.id <> $3
       AND NOT EXISTS (SELECT 1 FROM mastered m WHERE m.user_id = $2 AND m.question_id = q.id)
     ORDER BY random() LIMIT 1`;
  let { rows } = await pool.query(pickSql, [req.params.code, req.user.id, exclude]);
  if (!rows[0] && exclude) {
    // 只剩剛剛答錯的那一題時，仍然讓它出現
    ({ rows } = await pool.query(pickSql, [req.params.code, req.user.id, 0]));
  }
  if (!rows[0]) return res.json({ done: true, progress });
  res.json({ question: rows[0], progress });
}));

app.post('/api/quiz/answer', auth, wrap(async (req, res) => {
  const questionId = Number(req.body && req.body.questionId);
  const choice = Number(req.body && req.body.choice);
  if (!Number.isInteger(questionId) || !Number.isInteger(choice) || choice < 0 || choice > 9) {
    return res.status(400).json({ error: '作答資料不正確' });
  }
  const result = await tx(async (c) => {
    const { rows } = await c.query(
      `SELECT q.answer, q.explanation, q.choices, s.code
         FROM questions q JOIN subjects s ON s.id = q.subject_id WHERE q.id = $1`,
      [questionId]
    );
    const q = rows[0];
    if (!q || choice >= q.choices.length) return null;
    const correct = choice === q.answer;
    await c.query('INSERT INTO answers (user_id, question_id, chosen, is_correct) VALUES ($1, $2, $3, $4)',
      [req.user.id, questionId, choice, correct]);
    if (correct) {
      await c.query('INSERT INTO mastered (user_id, question_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, questionId]);
    }
    return { correct, answer: q.answer, explanation: q.explanation, code: q.code };
  });
  if (!result) return res.status(404).json({ error: '找不到這一題' });
  const progress = await subjectProgress(req.user.id, result.code);
  res.json({ correct: result.correct, answer: result.answer, explanation: result.explanation, progress });
}));

// ---------- 報告 ----------
async function studentReport(userId) {
  const [summary, subjects, daily, logins, weak] = await Promise.all([
    pool.query('SELECT * FROM v_student_login_report WHERE user_id = $1', [userId]),
    pool.query(
      `SELECT subject_code AS code, subject_name AS name, total_questions::int AS total, mastered::int AS mastered,
              attempts::int AS attempts, correct_attempts::int AS correct
         FROM v_student_subject_progress WHERE user_id = $1 ORDER BY sort_order`, [userId]),
    pool.query(
      `SELECT to_char(d, 'YYYY-MM-DD') AS day,
              count(a.id)::int AS attempts,
              count(a.id) FILTER (WHERE a.is_correct)::int AS correct
         FROM generate_series((now() AT TIME ZONE 'Asia/Taipei')::date - 13,
                              (now() AT TIME ZONE 'Asia/Taipei')::date, interval '1 day') AS d
         LEFT JOIN answers a ON a.user_id = $1 AND (a.answered_at AT TIME ZONE 'Asia/Taipei')::date = d::date
        GROUP BY d ORDER BY d`, [userId]),
    pool.query(
      `SELECT logged_in_at, ip FROM login_events WHERE user_id = $1 ORDER BY logged_in_at DESC LIMIT 10`, [userId]),
    pool.query(
      `SELECT s.name AS subject, q.topic, count(*)::int AS attempts,
              round(100.0 * count(*) FILTER (WHERE a.is_correct) / count(*))::int AS accuracy
         FROM answers a JOIN questions q ON q.id = a.question_id JOIN subjects s ON s.id = q.subject_id
        WHERE a.user_id = $1
        GROUP BY s.name, s.sort_order, q.topic HAVING count(*) >= 3
        ORDER BY accuracy, attempts DESC LIMIT 5`, [userId]),
  ]);
  return {
    summary: summary.rows[0],
    subjects: subjects.rows,
    daily: daily.rows,
    recentLogins: logins.rows,
    weakTopics: weak.rows,
  };
}

app.get('/api/report/me', auth, wrap(async (req, res) => {
  res.json(await studentReport(req.user.id));
}));

async function adminReport(grade) {
  const g = Number.parseInt(grade, 10);
  const filter = g >= 1 && g <= 6 ? g : null;
  const [students, perSubject, subjects, daily] = await Promise.all([
    pool.query(
      `SELECT user_id, username, display_name, grade, role, created_at, login_count::int, last_login_at,
              active_days::int, attempts::int, correct_attempts::int, mastered::int, last_answer_at
         FROM v_student_login_report WHERE ($1::int IS NULL OR grade = $1)
        ORDER BY grade, username`, [filter]),
    pool.query(
      `SELECT user_id, subject_code, mastered::int FROM v_student_subject_progress
        WHERE ($1::int IS NULL OR grade = $1)`, [filter]),
    pool.query(
      `SELECT s.code, s.name, count(q.id)::int AS total FROM subjects s LEFT JOIN questions q ON q.subject_id = s.id
        GROUP BY s.id ORDER BY s.sort_order`),
    pool.query(
      `SELECT to_char(d, 'YYYY-MM-DD') AS day,
              count(DISTINCT l.user_id)::int AS users,
              count(l.id)::int AS logins
         FROM generate_series((now() AT TIME ZONE 'Asia/Taipei')::date - 29,
                              (now() AT TIME ZONE 'Asia/Taipei')::date, interval '1 day') AS d
         LEFT JOIN login_events l ON (l.logged_in_at AT TIME ZONE 'Asia/Taipei')::date = d::date
          AND l.user_id IN (SELECT id FROM users WHERE $1::int IS NULL OR grade = $1)
        GROUP BY d ORDER BY d`, [filter]),
  ]);
  const byUser = new Map();
  for (const row of perSubject.rows) {
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, {});
    byUser.get(row.user_id)[row.subject_code] = row.mastered;
  }
  const list = students.rows.map((s) => ({ ...s, subjects: byUser.get(s.user_id) || {} }));
  const totals = {
    students: list.length,
    activeLast7Days: list.filter((s) => s.last_login_at && Date.now() - new Date(s.last_login_at) < 7 * 86400000).length,
    logins: list.reduce((a, s) => a + s.login_count, 0),
    attempts: list.reduce((a, s) => a + s.attempts, 0),
    mastered: list.reduce((a, s) => a + s.mastered, 0),
  };
  return { subjects: subjects.rows, students: list, totals, dailyLogins: daily.rows, grade: filter };
}

app.get('/api/report/admin', auth, adminOnly, wrap(async (req, res) => {
  res.json(await adminReport(req.query.grade));
}));

function csvCell(v) {
  const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
  // 防止試算表公式注入
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

app.get('/api/report/admin.csv', auth, adminOnly, wrap(async (req, res) => {
  const report = await adminReport(req.query.grade);
  const header = ['帳號', '暱稱', '年級', '註冊時間', '登入次數', '登入天數', '最後登入', '作答次數', '答對次數', '正確率(%)',
    '已精熟題數', ...report.subjects.map((s) => `${s.name}精熟(/${s.total})`), '最後作答'];
  const lines = [header.map(csvCell).join(',')];
  for (const s of report.students) {
    lines.push([
      s.username, s.display_name, s.grade, s.created_at, s.login_count, s.active_days, s.last_login_at, s.attempts,
      s.correct_attempts, s.attempts ? Math.round((100 * s.correct_attempts) / s.attempts) : '', s.mastered,
      ...report.subjects.map((sub) => s.subjects[sub.code] || 0), s.last_answer_at,
    ].map(csvCell).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="student-report-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('﻿' + lines.join('\r\n'));
}));

app.use('/api', (req, res) => res.status(404).json({ error: '找不到這個網址' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '伺服器發生錯誤，請稍後再試' });
});

// 定期清除過期的登入工作階段
setInterval(() => pool.query('DELETE FROM sessions WHERE expires_at < now()').catch(() => {}), 3600 * 1000).unref();

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`國小線上測驗系統已啟動：http://localhost:${port}`));
}

module.exports = app;
