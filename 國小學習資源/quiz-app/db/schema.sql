-- 國小各科線上測驗系統 資料庫結構（PostgreSQL 13+）
-- 可重複執行：資料表使用 IF NOT EXISTS，檢視表會重建。

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE CHECK (username ~ '^[A-Za-z0-9_]{3,32}$'),
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  grade         SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 6),
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- 每次成功登入（含註冊後自動登入）記錄一筆，供登入統計報告使用
CREATE TABLE IF NOT EXISTS login_events (
  id           BIGSERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip           TEXT,
  user_agent   TEXT
);
CREATE INDEX IF NOT EXISTS login_events_user_idx ON login_events (user_id, logged_in_at DESC);

CREATE TABLE IF NOT EXISTS subjects (
  id         SERIAL PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
  id          SERIAL PRIMARY KEY,
  subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  qkey        TEXT NOT NULL UNIQUE,          -- 題目唯一鍵（科目＋題幹＋選項），讓匯入可重複執行
  grade       SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 6),
  topic       TEXT NOT NULL,
  stem        TEXT NOT NULL,
  choices     JSONB NOT NULL,                -- 字串陣列
  answer      SMALLINT NOT NULL,             -- 正確選項索引（從 0 開始）
  explanation TEXT
);
CREATE INDEX IF NOT EXISTS questions_subject_idx ON questions (subject_id);

-- 每一次作答紀錄
CREATE TABLE IF NOT EXISTS answers (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  chosen      SMALLINT NOT NULL,
  is_correct  BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS answers_user_idx ON answers (user_id, answered_at DESC);

-- 已答對（精熟）的題目：存在於此表的題目不會再出給該學生
CREATE TABLE IF NOT EXISTS mastered (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  mastered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

-- 報告用檢視表（不含資料，每次重建）：每位學生 × 每個科目的進度
DROP VIEW IF EXISTS v_student_subject_progress;
CREATE VIEW v_student_subject_progress AS
SELECT u.id AS user_id,
       u.username,
       u.display_name,
       u.grade,
       s.code AS subject_code,
       s.name AS subject_name,
       s.sort_order,
       (SELECT count(*) FROM questions q WHERE q.subject_id = s.id)::int AS total_questions,
       (SELECT count(*) FROM mastered m JOIN questions q ON q.id = m.question_id
         WHERE m.user_id = u.id AND q.subject_id = s.id)::int AS mastered,
       (SELECT count(*) FROM answers a JOIN questions q ON q.id = a.question_id
         WHERE a.user_id = u.id AND q.subject_id = s.id)::int AS attempts,
       (SELECT count(*) FROM answers a JOIN questions q ON q.id = a.question_id
         WHERE a.user_id = u.id AND q.subject_id = s.id AND a.is_correct)::int AS correct_attempts
FROM users u CROSS JOIN subjects s;

-- 報告用檢視表：每位學生的登入與整體進度
DROP VIEW IF EXISTS v_student_login_report;
CREATE VIEW v_student_login_report AS
SELECT u.id AS user_id,
       u.username,
       u.display_name,
       u.grade,
       u.role,
       u.created_at,
       (SELECT count(*) FROM login_events l WHERE l.user_id = u.id)::int AS login_count,
       (SELECT max(logged_in_at) FROM login_events l WHERE l.user_id = u.id) AS last_login_at,
       (SELECT count(DISTINCT (l.logged_in_at AT TIME ZONE 'Asia/Taipei')::date)
          FROM login_events l WHERE l.user_id = u.id)::int AS active_days,
       (SELECT count(*) FROM answers a WHERE a.user_id = u.id)::int AS attempts,
       (SELECT count(*) FROM answers a WHERE a.user_id = u.id AND a.is_correct)::int AS correct_attempts,
       (SELECT count(*) FROM mastered m WHERE m.user_id = u.id)::int AS mastered,
       (SELECT max(answered_at) FROM answers a WHERE a.user_id = u.id) AS last_answer_at
FROM users u;
