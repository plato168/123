#!/usr/bin/env node
/**
 * 車床外徑產生器邏輯驗證（與 lathe-turning-generator.html 同步規則）
 */
const TOOL_NOSE_R = 0.4;
const OD_STOCK = 0.4;

function fmt(value, digits = 4) {
  return Number(value).toFixed(digits);
}

function fmtCoord(value) {
  const text = Number(value).toFixed(4);
  return text.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');
}

function roughX(finishDiameter) {
  return finishDiameter + OD_STOCK;
}

function shoulderZ(z) {
  return z + TOOL_NOSE_R;
}

function shoulderX(finishDiameter) {
  return finishDiameter + 2 * TOOL_NOSE_R;
}

function buildRoughPasses(stockDiameter, targetDiameter, roughDepth) {
  const passes = [];
  let current = stockDiameter;
  const goal = roughX(targetDiameter);
  while (current - roughDepth > goal) {
    current -= roughDepth;
    passes.push(current);
  }
  if (Math.abs(current - goal) > 1e-6) passes.push(goal);
  return passes;
}

const sample = {
  stockDiameter: 52,
  roughDepth: 1.5,
  segments: [
    { type: 'chamfer', zStart: 0, zEnd: 0, diameter: 50, extra: 1 },
    { type: 'od', zStart: 0, zEnd: -50, diameter: 50, extra: 0 },
    { type: 'fillet', zStart: -50, zEnd: -52, diameter: 40, extra: 2 },
    { type: 'od', zStart: -52, zEnd: -100, diameter: 40, extra: 0 }
  ]
};

const maxOd = Math.max(...sample.segments.filter((s) => s.type !== 'chamfer').map((s) => s.diameter));
const roughPasses = buildRoughPasses(sample.stockDiameter, maxOd, sample.roughDepth);
const finalRoughX = roughPasses[roughPasses.length - 1];

const checks = [
  ['刀尖半徑固定 0.4', TOOL_NOSE_R === 0.4],
  ['外徑粗車預留 0.4', OD_STOCK === 0.4],
  ['粗車最終 X = 50.4', Math.abs(finalRoughX - 50.4) < 1e-6],
  ['肩位 Z 補償 = zEnd + 0.4', Math.abs(shoulderZ(-50) - (-49.6)) < 1e-6],
  ['肩位 X 補償 = 小徑 + 0.8', Math.abs(shoulderX(40) - 40.8) < 1e-6],
  ['逃角刀心半徑 = 工件 R + 0.4', Math.abs((2 + TOOL_NOSE_R) - 2.4) < 1e-6],
  ['倒角終點 X = 50 - 2C', Math.abs((50 - 2 * 1) - 48) < 1e-6]
];

let failed = 0;
for (const [name, ok] of checks) {
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`${status}: ${name}`);
  if (!ok) failed += 1;
}

if (failed > 0) {
  process.exit(1);
}

console.log('\n粗車刀數:', roughPasses.length);
console.log('粗車 X 序列:', roughPasses.map((x) => fmt(x)).join(', '));
console.log('精車肩位 Z-50 程式座標:', fmtCoord(shoulderZ(-50)));
console.log('驗證全部通過。');
