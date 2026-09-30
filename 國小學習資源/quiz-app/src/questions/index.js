'use strict';
const { Rand } = require('./util');

const QUESTIONS_PER_SUBJECT = 1000;

const SUBJECTS = [
  { code: 'chinese', name: '國語', sortOrder: 1, build: require('./chinese') },
  { code: 'math', name: '數學', sortOrder: 2, build: require('./math') },
  { code: 'english', name: '英語', sortOrder: 3, build: require('./english') },
  { code: 'science', name: '自然', sortOrder: 4, build: require('./science') },
  { code: 'social', name: '社會', sortOrder: 5, build: require('./social') },
  { code: 'computing', name: '資訊', sortOrder: 6, build: require('./computing') },
];

function qkey(code, q) {
  return `${code}|${q.stem}|${q.choices.slice().sort().join('|')}`;
}

// 從各主題題組輪流取題，讓 1000 題平均涵蓋各主題。
function buildSubject(subject, count = QUESTIONS_PER_SUBJECT) {
  const pools = subject.build(new Rand(subject.sortOrder * 7919)).map((p) => p.items.slice());
  const out = [];
  const seen = new Set();
  while (out.length < count && pools.some((p) => p.length)) {
    for (const p of pools) {
      if (out.length >= count) break;
      while (p.length) {
        const q = p.shift();
        const key = qkey(subject.code, q);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ ...q, qkey: key });
        break;
      }
    }
  }
  if (out.length < count) {
    throw new Error(`${subject.name} 只產生 ${out.length} 題，不足 ${count} 題`);
  }
  return out;
}

module.exports = { SUBJECTS, QUESTIONS_PER_SUBJECT, buildSubject };
