#!/usr/bin/env node
// npm run check — walks every experiments/**/check.js, runs the checks and
// prints a ✓/✗ table grouped by category, with per-check execution time
// (performance-regression detection with no dedicated benchmark infra).

import { readdirSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(process.cwd(), 'src/experiments');

function findChecks(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findChecks(p));
    else if (entry.name === 'check.js') out.push(p);
  }
  return out;
}

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

let pass = 0;
let fail = 0;
const files = findChecks(ROOT);

if (files.length === 0) {
  console.error('no check.js found under src/experiments/');
  process.exit(1);
}

for (const file of files) {
  const relKey = file.slice(ROOT.length + 1).split(sep).slice(0, -1).join('/');
  console.log(`\n${bold(relKey)}`);
  let checks;
  try {
    ({ checks } = await import(pathToFileURL(file).href));
  } catch (err) {
    console.log(`  ${red('✗')} failed to load: ${err.message}`);
    fail++;
    continue;
  }
  const byCategory = new Map();
  for (const c of checks ?? []) {
    const cat = c.category ?? 'numeric';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(c);
  }
  for (const [category, list] of byCategory) {
    console.log(`  ${dim(category)}`);
    for (const c of list) {
      const t0 = performance.now();
      let res;
      try {
        res = c.run();
      } catch (err) {
        res = { ok: false, detail: String(err?.message ?? err) };
      }
      const ms = (performance.now() - t0).toFixed(1);
      res.ok ? pass++ : fail++;
      const mark = res.ok ? green('✓') : red('✗');
      console.log(`    ${mark} ${c.name}  ${dim(`${res.detail ?? ''}  (${ms} ms)`)}`);
    }
  }
}

console.log(`\n${pass} passed, ${fail === 0 ? '0 failed' : red(`${fail} failed`)}`);
process.exit(fail ? 1 : 0);
