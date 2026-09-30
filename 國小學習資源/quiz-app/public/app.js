'use strict';

const app = document.getElementById('app');
let me = null;

// ---------- 共用 ----------
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/api/login')) {
    me = null;
    renderNav();
    location.hash = '#/login';
  }
  if (!res.ok) throw new Error(data.error || '發生錯誤');
  return data;
}

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) el.append(c instanceof Node ? c : String(c));
  return el;
}

const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const fmtTime = (t) => (t ? new Date(t).toLocaleString('zh-TW', { hour12: false }) : '—');
const progressBar = (value, total) => h('div', { class: 'progress', title: `${value} / ${total}` },
  h('span', { style: `width:${pct(value, total)}%` }));

function renderNav() {
  document.getElementById('nav').hidden = !me;
  if (!me) return;
  document.getElementById('nav-user').textContent = `${me.displayName}（${me.grade} 年級）`;
  document.getElementById('nav-admin').hidden = me.role !== 'admin';
}

document.getElementById('logout').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  me = null;
  renderNav();
  location.hash = '#/login';
});

// ---------- 登入／註冊 ----------
function viewAuth() {
  app.replaceChildren(document.getElementById('tpl-auth').content.cloneNode(true));
  const err = document.getElementById('auth-error');
  const forms = { login: document.getElementById('form-login'), register: document.getElementById('form-register') };
  app.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
    app.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    for (const [k, f] of Object.entries(forms)) f.hidden = k !== tab.dataset.tab;
    err.textContent = '';
  }));
  for (const [kind, form] of Object.entries(forms)) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      const body = Object.fromEntries(new FormData(form));
      if (body.grade) body.grade = Number(body.grade);
      const btn = form.querySelector('button');
      btn.disabled = true;
      try {
        const data = await api(`/api/${kind}`, { method: 'POST', body: JSON.stringify(body) });
        me = data.user;
        renderNav();
        location.hash = '#/';
      } catch (ex) {
        err.textContent = ex.message;
      } finally {
        btn.disabled = false;
      }
    });
  }
}

// ---------- 科目列表 ----------
async function viewHome() {
  const { subjects } = await api('/api/subjects');
  app.replaceChildren(
    h('h1', {}, `${me.displayName}，今天想練習哪一科？`),
    h('p', { class: 'muted' }, '每科 1000 題，答對的題目就不會再出現，答錯的題目之後還會再遇到。'),
    h('div', { class: 'grid' }, subjects.map((s) => h('article', { class: 'card subject' },
      h('h3', {}, s.name),
      progressBar(s.mastered, s.total),
      h('div', { class: 'muted' }, `已答對 ${s.mastered} / ${s.total} 題（${pct(s.mastered, s.total)}%）`),
      h('div', { class: 'muted' }, `作答 ${s.attempts} 次，正確率 ${pct(s.correct, s.attempts)}%`),
      s.mastered >= s.total
        ? h('strong', {}, '🎉 全部完成！')
        : h('button', { class: 'primary', onclick: () => { location.hash = `#/quiz/${s.code}`; } },
          s.attempts ? '繼續練習' : '開始練習')
    )))
  );
}

// ---------- 測驗 ----------
async function viewQuiz(code) {
  let lastWrong = 0;
  let streak = 0;
  const box = h('section', { class: 'card quiz' });
  app.replaceChildren(h('p', {}, h('a', { href: '#/' }, '← 回到科目列表')), box);

  async function next() {
    box.replaceChildren(h('p', { class: 'muted' }, '載入題目中…'));
    const data = await api(`/api/quiz/${code}/next${lastWrong ? `?exclude=${lastWrong}` : ''}`);
    if (data.done) {
      box.replaceChildren(h('h1', {}, '🎉 恭喜！這一科的題目全部答對了！'),
        h('div', { class: 'actions' }, h('button', { class: 'primary', onclick: () => { location.hash = '#/'; } }, '選擇其他科目')));
      return;
    }
    const q = data.question;
    const header = (p) => h('div', { class: 'meta muted' },
      h('span', {}, `${q.topic}・${q.grade} 年級`),
      h('span', {}, `已答對 ${p.mastered} / ${p.total}${streak > 1 ? `・連續答對 ${streak} 題 🔥` : ''}`));
    const meta = header(data.progress);
    const bar = progressBar(data.progress.mastered, data.progress.total);
    const buttons = q.choices.map((c, i) => h('button', { class: 'choice', onclick: () => answer(i) },
      `${'ABCD'[i] || i + 1}. ${c}`));
    const feedback = h('div');
    box.replaceChildren(meta, bar, h('div', { class: 'stem' }, q.stem), h('div', { class: 'choices' }, buttons), feedback);

    async function answer(i) {
      buttons.forEach((b) => { b.disabled = true; });
      try {
        const res = await api('/api/quiz/answer', { method: 'POST', body: JSON.stringify({ questionId: q.id, choice: i }) });
        buttons[res.answer].classList.add('right');
        if (!res.correct) buttons[i].classList.add('wrong');
        streak = res.correct ? streak + 1 : 0;
        lastWrong = res.correct ? 0 : q.id;
        meta.replaceWith(header(res.progress));
        bar.replaceWith(progressBar(res.progress.mastered, res.progress.total));
        const nextBtn = h('button', { class: 'primary', onclick: next }, '下一題 →');
        feedback.replaceChildren(
          h('div', { class: `feedback ${res.correct ? 'right' : 'wrong'}` },
            h('strong', {}, res.correct ? '✅ 答對了！這題不會再出現。' : '❌ 答錯了，這題之後會再出現。'),
            res.explanation ? h('div', {}, res.explanation) : null),
          h('div', { class: 'actions' }, nextBtn, h('button', { class: 'secondary', onclick: () => { location.hash = '#/report'; } }, '看我的報告')));
        nextBtn.focus();
      } catch (ex) {
        feedback.replaceChildren(h('p', { class: 'error' }, ex.message));
        buttons.forEach((b) => { b.disabled = false; });
      }
    }
  }
  await next();
}

// ---------- 我的報告 ----------
function dailyBars(rows, valueKey, label) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  return h('div', { class: 'card' },
    h('div', { class: 'bars' }, rows.map((r) => h('div', { title: `${r.day}：${label} ${r[valueKey]}` },
      h('small', {}, r[valueKey] || ''),
      h('span', { style: `height:${Math.round((80 * r[valueKey]) / max)}px` }),
      h('small', {}, Number(r.day.slice(8)))))));
}

async function viewReport() {
  const r = await api('/api/report/me');
  const s = r.summary;
  const totalQ = r.subjects.reduce((a, x) => a + x.total, 0);
  app.replaceChildren(
    h('div', { class: 'toolbar' }, h('h1', { style: 'margin:0;flex:1' }, `${s.display_name} 的學習報告`),
      h('button', { class: 'secondary', onclick: () => window.print() }, '列印／存成 PDF')),
    h('div', { class: 'stats' },
      stat('登入次數', s.login_count), stat('登入天數', s.active_days), stat('作答次數', s.attempts),
      stat('整體正確率', `${pct(s.correct_attempts, s.attempts)}%`), stat('已答對題數', `${s.mastered} / ${totalQ}`),
      stat('最後登入', fmtTime(s.last_login_at))),
    h('h2', {}, '各科進度'),
    table(['科目', '已答對', '總題數', '完成度', '作答次數', '正確率'], r.subjects.map((x) => [
      x.name, x.mastered, x.total, h('div', { style: 'min-width:120px' }, progressBar(x.mastered, x.total), `${pct(x.mastered, x.total)}%`),
      x.attempts, `${pct(x.correct, x.attempts)}%`]), [1, 2, 4, 5]),
    h('h2', {}, '最近 14 天作答題數'),
    dailyBars(r.daily, 'attempts', '作答'),
    h('h2', {}, '需要加強的主題'),
    r.weakTopics.length
      ? table(['科目', '主題', '作答次數', '正確率'], r.weakTopics.map((w) => [w.subject, w.topic, w.attempts, `${w.accuracy}%`]), [2, 3])
      : h('p', { class: 'muted' }, '每個主題作答 3 次以上後，這裡會列出正確率最低的主題。'),
    h('h2', {}, '最近登入紀錄'),
    table(['登入時間', 'IP'], r.recentLogins.map((l) => [fmtTime(l.logged_in_at), l.ip || '—']))
  );
}

function stat(label, value) {
  return h('div', { class: 'stat' }, h('span', { class: 'muted' }, label), h('b', {}, value));
}

function table(headers, rows, numCols = []) {
  return h('div', { class: 'table-wrap' }, h('table', {},
    h('thead', {}, h('tr', {}, headers.map((x, i) => h('th', { class: numCols.includes(i) ? 'num' : '' }, x)))),
    h('tbody', {}, rows.map((row) => h('tr', {}, row.map((c, i) => h('td', { class: numCols.includes(i) ? 'num' : '' }, c)))))));
}

// ---------- 管理者：全體登入與進度統計報告 ----------
async function viewAdmin(grade) {
  const r = await api(`/api/report/admin${grade ? `?grade=${grade}` : ''}`);
  const select = h('select', { onchange: (e) => { location.hash = e.target.value ? `#/admin/${e.target.value}` : '#/admin'; } },
    h('option', { value: '' }, '全部年級'),
    [1, 2, 3, 4, 5, 6].map((g) => h('option', { value: g, selected: r.grade === g ? '' : false }, `${g} 年級`)));
  const t = r.totals;
  app.replaceChildren(
    h('div', { class: 'toolbar' },
      h('h1', { style: 'margin:0;flex:1' }, '使用者登入與進度統計報告'),
      select,
      h('a', { href: `/api/report/admin.csv${r.grade ? `?grade=${r.grade}` : ''}` }, h('button', { class: 'secondary' }, '下載 CSV')),
      h('button', { class: 'secondary', onclick: () => window.print() }, '列印／存成 PDF')),
    h('p', { class: 'muted' }, `產生時間：${fmtTime(new Date())}`),
    h('div', { class: 'stats' },
      stat('使用者人數', t.students), stat('近 7 天有登入', t.activeLast7Days), stat('總登入次數', t.logins),
      stat('總作答次數', t.attempts), stat('總答對題數', t.mastered)),
    h('h2', {}, '最近 30 天每日登入人數'),
    dailyBars(r.dailyLogins, 'users', '登入人數'),
    h('h2', {}, '每位學生'),
    table(
      ['帳號', '暱稱', '年級', '登入次數', '登入天數', '最後登入', '作答次數', '正確率', '已答對', ...r.subjects.map((s) => s.name), '註冊時間'],
      r.students.map((s) => [s.username, s.display_name + (s.role === 'admin' ? '（管理者）' : ''), s.grade, s.login_count,
        s.active_days, fmtTime(s.last_login_at), s.attempts, `${pct(s.correct_attempts, s.attempts)}%`, s.mastered,
        ...r.subjects.map((sub) => `${s.subjects[sub.code] || 0} (${pct(s.subjects[sub.code] || 0, sub.total)}%)`),
        fmtTime(s.created_at)]),
      [2, 3, 4, 6, 7, 8, ...r.subjects.map((_, i) => 9 + i)])
  );
}

// ---------- 路由 ----------
async function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  try {
    if (!me) {
      try { me = (await api('/api/me')).user; } catch { me = null; }
      renderNav();
    }
    if (!me || parts[0] === 'login') {
      if (me) { location.hash = '#/'; return; }
      viewAuth();
      return;
    }
    if (parts[0] === 'quiz' && parts[1]) await viewQuiz(parts[1]);
    else if (parts[0] === 'report') await viewReport();
    else if (parts[0] === 'admin') await viewAdmin(parts[1]);
    else await viewHome();
  } catch (ex) {
    app.replaceChildren(h('p', { class: 'error' }, ex.message));
  }
}

window.addEventListener('hashchange', route);
route();
