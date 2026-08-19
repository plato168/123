#!/usr/bin/env node
/**
 * 產生範例 NC 檔（規則與 lathe-turning-generator.html 一致）
 */
import { writeFileSync } from 'node:fs';

const TOOL_NOSE_R = 0.4;
const OD_STOCK = 0.4;

function fmt(value, digits = 4) {
  return Number(value).toFixed(digits);
}

function fmtCoord(value) {
  const text = Number(value).toFixed(4);
  return text.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');
}

function roughX(d) { return d + OD_STOCK; }
function finishX(d) { return d; }
function shoulderZ(z) { return z + TOOL_NOSE_R; }
function shoulderX(d) { return d + 2 * TOOL_NOSE_R; }

function buildRoughPasses(stock, target, depth) {
  const passes = [];
  let current = stock;
  const goal = roughX(target);
  while (current - depth > goal) {
    current -= depth;
    passes.push(current);
  }
  if (Math.abs(current - goal) > 1e-6) passes.push(goal);
  return passes;
}

const p = {
  stockDiameter: 52,
  roughDepth: 1.5,
  roughFeed: 0.2,
  finishFeed: 0.1,
  spindleSpeed: 800,
  approachZ: 2,
  toolNumber: '0101',
  safeX: 80,
  safeZ: 5,
  segments: [
    { type: 'od', zStart: 0, zEnd: -50, diameter: 50, extra: 0 },
    { type: 'fillet', zStart: -50, zEnd: -52, diameter: 40, extra: 2 },
    { type: 'od', zStart: -52, zEnd: -100, diameter: 40, extra: 0 },
    { type: 'chamfer', zStart: 0, zEnd: 0, diameter: 50, extra: 1 }
  ]
};

const lines = [];
const odSegments = p.segments.filter((s) => s.type === 'od');
const maxOd = 50;
const roughPasses = buildRoughPasses(p.stockDiameter, maxOd, p.roughDepth);

lines.push('(SAMPLE SHAFT - ROUGH/FINISH PER RULES)');
lines.push('(TOOL NOSE R0.4  OD STOCK DIA+0.4  NO G41/G42)');
lines.push(`N2  G0  X${fmtCoord(p.safeX)}. Z${fmtCoord(p.safeZ)}.`);
lines.push(`        T${p.toolNumber}`);
lines.push(`    G97 S${p.spindleSpeed}`);
lines.push('        M3');
lines.push('M8');
lines.push('(--- ROUGHING ---)');

let feedUsed = false;
for (const passX of roughPasses) {
  const feed = feedUsed ? '.' : ` F${fmtCoord(p.roughFeed)}.`;
  lines.push(`    G00 X${fmtCoord(passX + 2)}. Z${fmtCoord(p.approachZ)}.`);
  for (const seg of odSegments) {
    lines.push(`    G01 Z${fmtCoord(shoulderZ(seg.zEnd))}${feed}`);
    feedUsed = true;
  }
  lines.push(`    G00 X${fmtCoord(passX + 4)}. Z${fmtCoord(p.approachZ)}.`);
}

lines.push('        M09');
lines.push(`    G0  X${fmtCoord(p.safeX)}. Z${fmtCoord(p.safeZ)}. M5`);
lines.push('        M1');

lines.push('(--- FINISHING ---)');
lines.push(`N2  G0  X${fmtCoord(p.safeX)}. Z${fmtCoord(p.safeZ)}.`);
lines.push(`        T${p.toolNumber}`);
lines.push(`    G97 S${p.spindleSpeed}`);
lines.push('        M3');
lines.push('M8');
lines.push(`    G00 X${fmtCoord(shoulderX(maxOd))}. Z${fmtCoord(p.approachZ)}.`);

feedUsed = false;
for (let i = 0; i < p.segments.length; i += 1) {
  const seg = p.segments[i];
  const feed = feedUsed ? '.' : ` F${fmtCoord(p.finishFeed)}.`;

  if (seg.type === 'od') {
    lines.push(`(OD FINISH D${fmt(seg.diameter)} Z${fmtCoord(seg.zStart)} TO Z${fmtCoord(seg.zEnd)})`);
    lines.push(`    G01 Z${fmtCoord(shoulderZ(seg.zEnd))}${feed}`);
    feedUsed = true;
  }

  if (seg.type === 'fillet') {
    const toolPathR = seg.extra + TOOL_NOSE_R;
    lines.push(`(FILLET R${fmt(seg.extra)} TO D${fmt(seg.diameter)} - NO STOCK ALLOWANCE)`);
    lines.push(`    G01 X${fmtCoord(shoulderX(seg.diameter))}.`);
    lines.push(`    G02 X${fmtCoord(finishX(seg.diameter))}. Z${fmtCoord(seg.zEnd)}. R${fmtCoord(toolPathR)}.`);
    feedUsed = true;
  }

  if (seg.type === 'chamfer') {
    const c = seg.extra;
    lines.push(`(CHAMFER C${fmt(c)} X45 - NO STOCK ALLOWANCE)`);
    lines.push(`    G00 X${fmtCoord(shoulderX(seg.diameter))}. Z${fmtCoord(p.approachZ)}.`);
    lines.push(`    G01 X${fmtCoord(finishX(seg.diameter - 2 * c))}. Z${fmtCoord(seg.zStart - c)}${feed}`);
    feedUsed = true;
  }
}

lines.push('        M09');
lines.push(`    G0  X${fmtCoord(p.safeX)}. Z${fmtCoord(p.safeZ)}. M5`);
lines.push('        M1');

const code = lines.join('\n');
writeFileSync('/workspace/lathe_turning_sample.nc', code + '\n', 'utf8');
console.log('已寫入 lathe_turning_sample.nc');
console.log('行數:', lines.length);
console.log('含 G41/G42 指令:', /^\s*G4[12]\b/m.test(code) ? '是（錯誤）' : '否（正確）');
