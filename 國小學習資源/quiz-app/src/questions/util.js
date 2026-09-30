'use strict';

// 固定種子的亂數產生器：每次產生的題庫都一樣，重複匯入不會產生新題目。
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Rand {
  constructor(seed) {
    this.next = mulberry32(seed);
  }
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  sample(arr, n) {
    return this.shuffle(arr).slice(0, n);
  }
}

// 建立一題四選一的選擇題。distractors 會自動去重、排除正解，取前 3 個。
// allowFewer：分類只有 2～3 種時（例如會不會導電），允許少於四個選項。
function mc(r, { grade, topic, stem, answer, distractors, explanation, allowFewer = false }) {
  const ans = String(answer);
  const seen = new Set([ans]);
  const wrong = [];
  for (const d of distractors) {
    const s = String(d);
    if (!seen.has(s)) {
      seen.add(s);
      wrong.push(s);
    }
    if (wrong.length === 3) break;
  }
  // 整數答案的干擾選項不夠時，自動補上相鄰的數字
  if (Number.isInteger(answer)) {
    for (let k = 1; wrong.length < 3; k++) {
      const s = String(answer + k);
      if (!seen.has(s)) {
        seen.add(s);
        wrong.push(s);
      }
    }
  }
  if (wrong.length < 3 && !(allowFewer && wrong.length >= 1)) {
    throw new Error(`干擾選項不足：${stem}`);
  }
  const choices = r.shuffle([ans, ...wrong]);
  return { grade, topic, stem, choices, answer: choices.indexOf(ans), explanation: explanation || null };
}

// 數值題的干擾選項：在正解附近取不重複、非負的數。
function nearNumbers(r, ans, spread = 5, { allowNegative = false, step = 1, format = (x) => x } = {}) {
  const out = new Set();
  let guard = 0;
  while (out.size < 3 && guard++ < 200) {
    const off = r.int(1, spread) * step * (r.next() < 0.5 ? -1 : 1);
    const v = Math.round((ans + off) * 1000) / 1000;
    if (v === ans || (!allowNegative && v < 0)) continue;
    out.add(format(v));
  }
  for (let k = 1; out.size < 3; k++) out.add(format(Math.round((ans + k * step * 7) * 1000) / 1000));
  return [...out];
}

// 從「分類表」產生兩種題型：
//   1. 直接題：「X 屬於哪一類？」
//   2. 挑選題：「下列哪一個屬於 Y 類？」（一個正解＋三個其他類別的項目）
function classificationPools(r, { grade, topic, table, directStem, pickStem, explain, pickCount = 150 }) {
  const cats = Object.keys(table);
  const direct = [];
  for (const cat of cats) {
    for (const item of table[cat]) {
      direct.push(
        mc(r, {
          grade,
          topic,
          stem: directStem(item),
          answer: cat,
          distractors: r.shuffle(cats.filter((c) => c !== cat)),
          allowFewer: true,
          explanation: explain ? explain(item, cat) : `${item}：${cat}`,
        })
      );
    }
  }
  const pick = [];
  const keys = new Set();
  let guard = 0;
  while (pick.length < pickCount && guard++ < pickCount * 20) {
    const cat = r.pick(cats);
    const item = r.pick(table[cat]);
    const others = cats.filter((c) => c !== cat).flatMap((c) => table[c]);
    const wrong = r.sample(others, 3);
    const key = [item, ...wrong.slice().sort()].join('|');
    if (keys.has(key)) continue;
    keys.add(key);
    pick.push(
      mc(r, {
        grade,
        topic,
        stem: pickStem(cat),
        answer: item,
        distractors: wrong,
        explanation: explain ? explain(item, cat) : `${item}：${cat}`,
      })
    );
  }
  return [
    { topic, items: direct },
    { topic, items: pick },
  ];
}

module.exports = { Rand, mc, nearNumbers, classificationPools };
