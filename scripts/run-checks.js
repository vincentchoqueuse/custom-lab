#!/usr/bin/env node
// npm run check — walks every experiments/**/check.js, runs the checks and
// prints a ✓/✗ table grouped by category, with per-check execution time
// (performance-regression detection with no dedicated benchmark infra).
//
// It also runs the CATALOGUE checks first: the standard-figure vocabulary
// (core/figures.js) and the scene → view references. Those two are what the
// registry enforces at load time; running them here means a rename that
// breaks the catalogue fails in the harness, before the browser and long
// before a lecture hall.

import { readdirSync, existsSync } from 'node:fs';
import { join, resolve, sep, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { normalizeViews } from '../src/core/figures.js';
import { validateScene } from '../src/core/scenes.js';

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

/* ------------------------------------------------------------- catalogue --
   The vocabulary and the scene references, replayed exactly as the registry
   does it — but outside Vite, so `npm run check` catches them too. */
/**
 * Principle 4, made checkable: THE CORE KNOWS NO EXPERIMENT. It discovers
 * them by glob and never by name — so no file of src/core/ may import
 * anything under src/experiments/, in either direction of the path.
 *
 * Until the subject-specific modules moved next to their subject, this rule
 * lived only in prose. A `bode.js` sitting in core/ could have reached into
 * control/ and nothing would have said a word.
 */
function checkLayering() {
  const bad = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js') || e.name.endsWith('.svelte')) {
        const src = readFileSync(p, 'utf8');
        for (const m of src.matchAll(/from\s+'([^']+)'/g))
          if (/experiments\//.test(m[1])) bad.push(`${p} → ${m[1]}`);
      }
    }
  };
  walk(resolve(process.cwd(), 'src/core'));
  console.log(`  ${dim('layering')}`);
  if (bad.length) {
    for (const b of bad) console.log(`    ${red('✗')} core imports an experiment: ${b}`);
    fail++;
  } else {
    console.log(`    ${green('✓')} no file of core/ imports experiments/  ${dim('(principle 4)')}`);
    pass++;
  }
}

/**
 * `random: true` must say the truth, in both directions.
 *
 * The seed exists so a draw can be replayed; an experiment that draws
 * NOTHING — a Bode plot, a convolution, a pole map — used to carry the dice
 * button, the seed field and `?seed=` all the same, and pressing the dice
 * provably changed nothing. Half the catalogue was in that state.
 *
 * mulberry32 is the only generator the project allows (CLAUDE.md), so
 * "this experiment draws" is exactly "its compute reaches core/rng.js",
 * directly or through anything it imports. That is a fact about the source,
 * not a promise in a manifest, which is why it can be checked rather than
 * trusted: a manifest declaring `random: true` without a generator, or
 * using one without declaring it, fails here.
 */
function checkRandomness() {
  const EXP = resolve(process.cwd(), 'src/experiments');
  const cache = new Map();
  const reachesRng = (file, seen = new Set()) => {
    const abs = resolve(file);
    if (seen.has(abs)) return false;
    seen.add(abs);
    if (cache.has(abs)) return cache.get(abs);
    if (!existsSync(abs)) return false;
    const src = readFileSync(abs, 'utf8');
    let hit = /from\s+'[^']*core\/rng\.js'/.test(src);
    if (!hit)
      for (const m of src.matchAll(/from\s+'(\.[^']+\.js)'/g))
        if (reachesRng(resolve(dirname(abs), m[1]), seen)) {
          hit = true;
          break;
        }
    cache.set(abs, hit);
    return hit;
  };

  const bad = [];
  let n = 0;
  for (const sub of readdirSync(EXP, { withFileTypes: true })) {
    if (!sub.isDirectory()) continue;
    for (const exp of readdirSync(join(EXP, sub.name), { withFileTypes: true })) {
      if (!exp.isDirectory()) continue;
      const dir = join(EXP, sub.name, exp.name);
      if (!existsSync(join(dir, 'manifest.js'))) continue;
      n++;
      // `random: true,` followed by an explanatory comment is normal and
      // wanted — the pattern anchors on the comma, never on the line end.
      const declared = /^\s*random:\s*true\s*,/m.test(readFileSync(join(dir, 'manifest.js'), 'utf8'));
      const draws = reachesRng(join(dir, 'compute.js'));
      if (declared && !draws)
        bad.push(`${sub.name}/${exp.name}: declares random: true but never reaches core/rng.js`);
      if (!declared && draws)
        bad.push(`${sub.name}/${exp.name}: uses core/rng.js but does not declare random: true`);
    }
  }
  console.log(`  ${dim('randomness')}`);
  if (bad.length) {
    for (const b of bad) console.log(`    ${red('✗')} ${b}`);
    fail++;
  } else {
    console.log(`    ${green('✓')} random: true matches the generator in all ${n} experiments`);
    pass++;
  }
}

/**
 * Tout axe déclaratif porte un nom.
 *
 * Un axe sans libellé reste GRADUÉ : il se lit donc comme s'il mesurait
 * quelque chose, et le lecteur cherche un sens qui n'existe pas. C'est
 * arrivé une fois — l'ordonnée d'une vue portait un décalage aléatoire, mis
 * là pour étaler les points, et personne ne pouvait le deviner. La règle est
 * plus forte que « nommer les axes » : si on ne peut pas nommer un axe,
 * c'est qu'il ne faut pas le tracer.
 */
function checkAxisLabels(manifest, key, bad) {
  const text = (a) => (typeof a === 'string' ? a : (a?.label ?? ''));
  for (const v of manifest.views ?? []) {
    const ax = v.spec?.axes ?? v.plot?.axes;
    if (!ax) continue;
    for (const k of ['x', 'y']) {
      if (!text(ax[k]).trim())
        bad.push(`${key}, vue '${v.title ?? v.figure ?? v.id}' : axe ${k} sans nom`);
    }
  }
}

async function checkCatalogue() {
  console.log(bold('catalogue'));
  checkLayering();
  checkRandomness();
  console.log(`  ${dim('vocabulary')}`);
  let figuresOk = true;
  let scenesOk = true;
  const axisBad = [];
  let nViews = 0;
  let nScenes = 0;
  for (const sub of readdirSync(ROOT, { withFileTypes: true })) {
    if (!sub.isDirectory()) continue;
    const dir = join(ROOT, sub.name);
    const subjectFile = join(dir, '_subject.js');
    const subject = existsSync(subjectFile)
      ? (await import(pathToFileURL(subjectFile).href)).default
      : {};
    for (const exp of readdirSync(dir, { withFileTypes: true })) {
      const mf = join(dir, exp.name, 'manifest.js');
      if (!exp.isDirectory() || !existsSync(mf)) continue;
      const key = `${sub.name}/${exp.name}`;
      let views;
      let manifest;
      try {
        manifest = (await import(pathToFileURL(mf).href)).default;
        views = normalizeViews(manifest.views, subject, key);
        nViews += views.length;
      } catch (err) {
        figuresOk = false;
        console.log(`    ${red('✗')} ${err.message}`);
        continue;
      }
      checkAxisLabels(manifest, key, axisBad);
      const sf = join(dir, exp.name, 'scenes.js');
      if (!existsSync(sf)) continue;
      const scenes = (await import(pathToFileURL(sf).href)).default ?? [];
      for (const [i, sc] of scenes.entries()) {
        nScenes++;
        try {
          validateScene(sc, i, { views, params: manifest.params, random: manifest.random }, key);
        } catch (err) {
          scenesOk = false;
          console.log(`    ${red('✗')} ${err.message}`);
        }
      }
    }
  }
  if (figuresOk)
    console.log(`    ${green('✓')} standard figures: id, title and order  ${dim(`(${nViews} views)`)}`);
  console.log(`  ${dim('axes')}`);
  if (axisBad.length) {
    for (const b of axisBad) console.log(`    ${red('✗')} ${b}`);
    fail++;
  } else {
    console.log(`    ${green('✓')} tout axe déclaratif porte un nom`);
    pass++;
  }
  console.log(`  ${dim('scenes')}`);
  if (scenesOk)
    console.log(
      `    ${green('✓')} keys, types, view and param references  ${dim(`(${nScenes} scenes)`)}`
    );
  figuresOk ? pass++ : fail++;
  scenesOk ? pass++ : fail++;
  console.log('');
}

await checkCatalogue();

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
