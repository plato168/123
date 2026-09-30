'use strict';
const { mc, nearNumbers } = require('./util');

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// 反覆呼叫 make() 直到收集到 n 個題幹不重複的題目
function collect(n, make) {
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < n && guard++ < n * 50) {
    const q = make();
    if (!q || seen.has(q.stem)) continue;
    seen.add(q.stem);
    out.push(q);
  }
  return out;
}

module.exports = function math(r) {
  const pools = [];
  const add = (topic, n, make) => pools.push({ topic, items: collect(n, make) });

  add('加法', 120, () => {
    const big = r.next() < 0.5;
    const a = big ? r.int(100, 899) : r.int(2, 60);
    const b = big ? r.int(10, 999 - a) : r.int(2, 99 - a);
    if (b < 1) return null;
    const ans = a + b;
    return mc(r, { grade: big ? 2 : 1, topic: '加法', stem: `${a} + ${b} = ？`, answer: ans,
      distractors: nearNumbers(r, ans, 10), explanation: `${a} + ${b} = ${ans}` });
  });

  add('減法', 120, () => {
    const big = r.next() < 0.5;
    const a = big ? r.int(200, 999) : r.int(10, 99);
    const b = big ? r.int(10, a - 1) : r.int(1, a - 1);
    const ans = a - b;
    return mc(r, { grade: big ? 2 : 1, topic: '減法', stem: `${a} − ${b} = ？`, answer: ans,
      distractors: nearNumbers(r, ans, 10), explanation: `${a} − ${b} = ${ans}` });
  });

  add('九九乘法', 64, () => {
    const a = r.int(2, 9);
    const b = r.int(2, 9);
    const ans = a * b;
    return mc(r, { grade: 2, topic: '九九乘法', stem: `${a} × ${b} = ？`, answer: ans,
      distractors: [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, ans + 1, ans - 1].filter((x) => x > 0),
      explanation: `${a} 個 ${b} 是 ${ans}` });
  });

  add('除法', 120, () => {
    const b = r.int(2, 9);
    const ans = r.int(2, 30);
    const a = b * ans;
    return mc(r, { grade: 3, topic: '除法', stem: `${a} ÷ ${b} = ？`, answer: ans,
      distractors: nearNumbers(r, ans, 4), explanation: `${b} × ${ans} = ${a}，所以 ${a} ÷ ${b} = ${ans}` });
  });

  add('多位數乘法', 120, () => {
    const a = r.int(12, 99);
    const b = r.int(11, 49);
    const ans = a * b;
    return mc(r, { grade: 4, topic: '多位數乘法', stem: `${a} × ${b} = ？`, answer: ans,
      distractors: [ans + 10, ans - 10, ans + a, ans - a, ans + 100, ans - b].filter((x) => x > 0),
      explanation: `${a} × ${b} = ${ans}` });
  });

  add('分數加減', 120, () => {
    const d = r.int(3, 12);
    const plus = r.next() < 0.5;
    let x = r.int(1, d - 1);
    let y = r.int(1, d - 1);
    if (plus && x + y >= d) return null;
    if (!plus && x <= y) [x, y] = [y, x];
    if (!plus && x === y) return null;
    const n = plus ? x + y : x - y;
    const f = (k) => `${k}/${d}`;
    return mc(r, { grade: 3, topic: '分數加減', stem: `${x}/${d} ${plus ? '+' : '−'} ${y}/${d} = ？（同分母）`,
      answer: f(n), distractors: [f(n + 1), f(Math.max(n - 1, 0)), `${n}/${d * 2}`, f(n + 2), `${plus ? x + y : x - y}/${d + d}`]
        .filter((s) => s !== `0/${d}`),
      explanation: `分母不變，分子 ${x} ${plus ? '+' : '−'} ${y} = ${n}` });
  });

  add('小數加減', 120, () => {
    const a = r.int(11, 99) / 10;
    const b = r.int(11, 99) / 10;
    const plus = r.next() < 0.5 || a <= b;
    const ans = Math.round((plus ? a + b : a - b) * 10) / 10;
    return mc(r, { grade: 4, topic: '小數加減', stem: `${a.toFixed(1)} ${plus ? '+' : '−'} ${b.toFixed(1)} = ？`,
      answer: ans.toFixed(1), distractors: nearNumbers(r, ans, 5, { step: 0.1, format: (v) => v.toFixed(1) }),
      explanation: `小數點對齊計算：答案 ${ans.toFixed(1)}` });
  });

  add('周長與面積', 120, () => {
    const w = r.int(2, 20);
    const h = r.int(2, 20);
    const kind = r.pick(['長方形面積', '長方形周長', '正方形面積', '正方形周長']);
    const sq = kind.startsWith('正方形');
    const side = w;
    let ans;
    let stem;
    let exp;
    if (kind === '長方形面積') {
      if (w === h) return null;
      ans = w * h; stem = `長 ${w} 公分、寬 ${h} 公分的長方形，面積是多少平方公分？`; exp = `長 × 寬 = ${w} × ${h} = ${ans}`;
    } else if (kind === '長方形周長') {
      if (w === h) return null;
      ans = 2 * (w + h); stem = `長 ${w} 公分、寬 ${h} 公分的長方形，周長是多少公分？`; exp = `(長 + 寬) × 2 = (${w} + ${h}) × 2 = ${ans}`;
    } else if (kind === '正方形面積') {
      ans = side * side; stem = `邊長 ${side} 公分的正方形，面積是多少平方公分？`; exp = `邊長 × 邊長 = ${side} × ${side} = ${ans}`;
    } else {
      ans = side * 4; stem = `邊長 ${side} 公分的正方形，周長是多少公分？`; exp = `邊長 × 4 = ${side} × 4 = ${ans}`;
    }
    const alt = sq ? [side * side, side * 4, side * 2] : [w * h, 2 * (w + h), w + h];
    return mc(r, { grade: 4, topic: '周長與面積', stem, answer: ans,
      distractors: [...alt, ...nearNumbers(r, ans, 6), ans + 1, ans + 2, ans * 2].filter((x) => x !== ans && x > 0),
      explanation: exp });
  });

  add('單位換算', 120, () => {
    const kinds = [
      ['公尺', '公分', 100], ['公里', '公尺', 1000], ['公斤', '公克', 1000], ['公升', '毫升', 1000],
      ['小時', '分鐘', 60], ['分鐘', '秒', 60], ['公分', '毫米', 10],
    ];
    const [big, small, rate] = r.pick(kinds);
    const n = r.int(2, 15);
    const ans = n * rate;
    return mc(r, { grade: 3, topic: '單位換算', stem: `${n} ${big} = 幾 ${small}？`, answer: ans,
      distractors: [n * 10, n * 100, n * 1000, n * 60, n * rate + rate, n * rate - rate].filter((x) => x !== ans && x > 0),
      explanation: `1 ${big} = ${rate} ${small}，${n} × ${rate} = ${ans}` });
  });

  add('因數與倍數', 120, () => {
    const g = r.int(2, 12);
    let a = g * r.int(2, 9);
    let b = g * r.int(2, 9);
    if (a === b) return null;
    if (a > b) [a, b] = [b, a];
    const G = gcd(a, b);
    const L = (a * b) / G;
    if (r.next() < 0.5) {
      return mc(r, { grade: 5, topic: '因數與倍數', stem: `${a} 和 ${b} 的最大公因數是多少？`, answer: G,
        distractors: [G * 2, Math.max(1, G / 2), G + 1, a, G + 2, 1].filter((x) => Number.isInteger(x) && x !== G),
        explanation: `${a} 和 ${b} 共同的因數中最大的是 ${G}` });
    }
    return mc(r, { grade: 5, topic: '因數與倍數', stem: `${a} 和 ${b} 的最小公倍數是多少？`, answer: L,
      distractors: [a * b, L * 2, L + G, b, L - G].filter((x) => x > 0 && x !== L),
      explanation: `${a} × ${b} ÷ 最大公因數 ${G} = ${L}` });
  });

  add('百分率', 120, () => {
    const p = r.pick([5, 10, 20, 25, 30, 40, 50, 60, 75, 80]);
    const base = r.int(2, 40) * 20;
    const ans = (base * p) / 100;
    if (!Number.isInteger(ans)) return null;
    return mc(r, { grade: 6, topic: '百分率', stem: `${base} 的 ${p}% 是多少？`, answer: ans,
      distractors: [ans * 2, ans / 2, ans + 10, base - ans, ans + p].filter((x) => Number.isInteger(x) && x > 0 && x !== ans),
      explanation: `${base} × ${p}/100 = ${ans}` });
  });

  return pools;
};
