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
import * as dsp from '../src/core/dsp.js';
import * as la from '../src/core/linalg.js';
import { fft, median, medianInPlace } from '../src/core/numeric.js';
import { validateScene } from '../src/core/scenes.js';
import { castParam, parseHash, decodeQuery, encodeHash } from '../src/core/router.js';

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
 * Every declarative axis carries a name.
 *
 * An unlabelled axis is still TICKED: it therefore reads as if it measured
 * something, and the reader looks for a meaning that does not exist. It happened
 * once — the ordinate of a view carried a random offset, put there to spread the
 * points out, and nobody could have guessed it. The rule is stronger than "name
 * the axes": if an axis cannot be named, it should not be drawn.
 */
function checkAxisLabels(manifest, key, bad) {
  const text = (a) => (typeof a === 'string' ? a : (a?.label ?? ''));
  for (const v of manifest.views ?? []) {
    const ax = v.spec?.axes ?? v.plot?.axes;
    if (!ax) continue;
    for (const k of ['x', 'y']) {
      if (!text(ax[k]).trim())
        bad.push(`${key}, view '${v.title ?? v.figure ?? v.id}': axis ${k} has no name`);
    }
  }
}

/**
 * The call layer of the computes (core/dsp.js) is verified ONCE here, not once
 * per experiment. That is the whole point of having extracted it: nineteen
 * hand-written sinusoids are nineteen chances to get an index wrong; a single
 * function is an identity that can be pinned.
 *
 * The two identities that matter most are here: ifft∘fft = identity, and
 * dbAmp(x) = dbPower(x²) — the latter because confusing the two scales has
 * already cost a factor 2 on a perfectly plausible plot.
 */
function checkDsp() {
  const bad = [];
  const N = 256;
  const FS = 1000;
  const worst = (n, f) => Math.max(...Array.from({ length: n }, (_, i) => Math.abs(f(i))));

  // ifft ∘ fft = identity
  const x = dsp.tone(N, 50, { fs: FS, amp: 1.7, phase: 0.3 });
  const re = Float64Array.from(x);
  const im = new Float64Array(N);
  fft(re, im);
  dsp.ifft(re, im);
  const idErr = Math.max(worst(N, (i) => re[i] - x[i]), worst(N, (i) => im[i]));
  if (idErr > 1e-12) bad.push(`ifft∘fft : ${idErr.toExponential(1)}`);

  // dbAmp(x) = dbPower(x²), exactement
  const dbErr = worst(60, (i) => {
    const v = 10 ** (i / 10 - 3);
    return dsp.dbAmp(v) - dsp.dbPower(v * v);
  });
  if (dbErr > 1e-9) bad.push(`dbAmp/dbPower : ${dbErr.toExponential(1)}`);

  // a line on a bin: right position, and amplitude A·N/2 (rectangular window)
  const A = 1.3;
  const fBin = (FS * 8) / N; // pile sur le bin 8
  const mag = dsp.magSpectrum(dsp.tone(N, fBin, { fs: FS, amp: A }), { nfft: N });
  let kMax = 0;
  for (let k = 0; k < mag.length; k++) if (mag[k] > mag[kMax]) kMax = k;
  if (kMax !== 8) bad.push(`raie au bin ${kMax} au lieu de 8`);
  if (Math.abs(mag[8] - (A * N) / 2) > 1e-9)
    bad.push(`amplitude ${mag[8].toFixed(4)} au lieu de ${(A * N) / 2}`);

  // the half-spectrum runs to Nyquist INCLUSIVE, and so does the axis
  const f = dsp.freqAxis(N, FS);
  if (f.length !== N / 2 + 1 || f[f.length - 1] !== FS / 2)
    bad.push(`freqAxis : ${f.length} points, dernier ${f[f.length - 1]}`);
  if (mag.length !== N / 2 + 1) bad.push(`magSpectrum : ${mag.length} points`);

  // σ² = P/10^(SNR/10), exactement
  const sErr = worst(5, (i) => {
    const snr = i * 10 - 10;
    return dsp.noiseSigma(0.5, snr) ** 2 - 0.5 / 10 ** (snr / 10);
  });
  if (sErr > 1e-15) bad.push(`noiseSigma : ${sErr.toExponential(1)}`);

  // linspace: exact bounds, no error accumulation
  const g = dsp.linspace(-3, 7, 101);
  if (g[0] !== -3 || g[100] !== 7) bad.push(`linspace : [${g[0]}, ${g[100]}]`);

  console.log(`  ${dim('dsp')}`);
  if (bad.length) {
    for (const b of bad) console.log(`    ${red('✗')} ${b}`);
    fail++;
  } else {
    console.log(
      `    ${green('✓')} ifft∘fft, dbAmp = dbPower∘square, line on bin, Nyquist included, σ(SNR), linspace`
    );
    pass++;
  }
}

/**
 * medianInPlace agrees with median, EXACTLY, on every shape of input.
 *
 * A median is an order statistic, so selecting the middle rank and sorting for
 * it cannot legitimately disagree — which makes this a bit-for-bit identity
 * rather than a tolerance, and the only honest way to buy the faster one. The
 * inputs below are the ones that break a careless quickselect: already sorted
 * and reverse sorted (the quadratic pivot cases), all-equal, two values, and
 * both parities of length.
 */
function checkMedian() {
  const bad = [];
  const rand = (() => {
    let s = 12345;
    return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  })();
  const shapes = {
    sorted: (n) => Float64Array.from({ length: n }, (_, i) => i),
    reversed: (n) => Float64Array.from({ length: n }, (_, i) => n - i),
    equal: (n) => new Float64Array(n).fill(3.5),
    twoValued: (n) => Float64Array.from({ length: n }, (_, i) => (i % 2 ? 1 : -1)),
    random: (n) => Float64Array.from({ length: n }, () => rand() * 20 - 10),
    spiky: (n) => Float64Array.from({ length: n }, (_, i) => (i === 0 ? 1e9 : rand())),
  };
  for (const [shape, make] of Object.entries(shapes)) {
    for (let n = 1; n <= 65; n++) {
      const a = make(n);
      const want = median(a); // copies and sorts
      const got = medianInPlace(Float64Array.from(a)); // selects, in place
      if (!Object.is(want, got)) bad.push(`${shape} n=${n}: ${got} ≠ ${want}`);
    }
  }
  // and it really does leave the input alone when called through `median`
  const src = Float64Array.from([5, 1, 4, 2, 3]);
  median(src);
  if (String(src) !== '5,1,4,2,3') bad.push(`median mutated its input: ${src}`);

  console.log(`  ${dim('median')}`);
  if (bad.length) {
    for (const b of bad.slice(0, 6)) console.log(`    ${red('✗')} ${b}`);
    fail++;
  } else {
    console.log(
      `    ${green('✓')} select = sort, bit for bit, on 6 shapes × n = 1…65  ${dim('(390 cases)')}`
    );
    pass++;
  }
}

/**
 * The core's linear algebra (core/linalg.js), verified through its IDENTITIES —
 * once, here, rather than once per subject.
 *
 * The module deliberately holds only what experiments use (see its header). This
 * check is the counterpart of that rule: every function that goes in must arrive
 * with an identity that can be written down, or it does not go in.
 */
function checkLinalg() {
  const bad = [];
  const n = 5;
  const worst = (k, f) => Math.max(...Array.from({ length: k }, (_, i) => Math.abs(f(i))));

  // matvec : A = I laisse x intact, et A quelconque redonne le produit
  const I = new Float64Array(n * n);
  for (let i = 0; i < n; i++) I[i * n + i] = 1;
  const x = Float64Array.from({ length: n }, (_, i) => 1.7 - 0.4 * i);
  if (worst(n, (i) => la.matvec(I, x, n, n)[i] - x[i]) > 0) bad.push('matvec(I, x) ≠ x');

  // a symmetric test matrix, positive definite (AᵀA + I)
  const R = new Float64Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) R[i * n + j] = 1 / (1 + Math.abs(i - j)) + (i === j ? 1 : 0);

  // quadForm: xᵀRx = Σ x_i (Rx)_i, and Σ λ_k ⟨v_k, x⟩² through the decomposition
  const Rx = la.matvec(R, x, n, n);
  let direct = 0;
  for (let i = 0; i < n; i++) direct += x[i] * Rx[i];
  if (Math.abs(la.quadForm(R, x, n) - direct) > 1e-12) bad.push('quadForm ≠ xᵀ(Rx)');

  const eig = la.jacobiSym(Float64Array.from(R), n);
  let spectral = 0;
  for (let k = 0; k < n; k++) {
    let p = 0;
    for (let i = 0; i < n; i++) p += eig.vectors[i * n + k] * x[i];
    spectral += eig.values[k] * p * p;
  }
  if (Math.abs(spectral - direct) > 1e-12) bad.push(`Σλ⟨v,x⟩² : ${Math.abs(spectral - direct)}`);

  // jacobiSym: VᵀV = I, and Rv = λv
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      let d = 0;
      for (let i = 0; i < n; i++) d += eig.vectors[i * n + a] * eig.vectors[i * n + b];
      if (Math.abs(d - (a === b ? 1 : 0)) > 1e-12) bad.push('VᵀV ≠ I');
    }
  for (let k = 0; k < n; k++) {
    const v = Float64Array.from({ length: n }, (_, i) => eig.vectors[i * n + k]);
    const Rv = la.matvec(R, v, n, n);
    if (worst(n, (i) => Rv[i] - eig.values[k] * v[i]) > 1e-12) bad.push(`Rv ≠ λv (k=${k})`);
  }

  // solveLinearSystem: solve(A, A·x) returns x, including when the first pivot
  // is zero — that is where a missing partial pivot would show
  const A = [
    [0, 2, 1],
    [1, -1, 3],
    [2, 4, -1],
  ];
  const xs = [1.5, -2, 0.75];
  const b = A.map((r) => r[0] * xs[0] + r[1] * xs[1] + r[2] * xs[2]);
  const sol = la.solveLinearSystem(A.map((r) => r.slice()), b.slice());
  if (worst(3, (i) => sol[i] - xs[i]) > 1e-12) bad.push('solve(A, Ax) ≠ x');

  // normalEquations + ridgeSolve: on EXACTLY polynomial data, λ = 0 recovers the
  // coefficients; and λ > 0 shrinks the solution
  const xs2 = Array.from({ length: 40 }, (_, i) => -1 + (2 * i) / 39);
  const truth = [0.5, -1.25, 2];
  const ys = xs2.map((t) => truth[0] + truth[1] * t + truth[2] * t * t);
  const { AtA, Aty } = la.normalEquations(
    xs2.length,
    3,
    (i, row) => {
      row[0] = 1;
      row[1] = xs2[i];
      row[2] = xs2[i] * xs2[i];
    },
    ys
  );
  const w0 = la.ridgeSolve(AtA, Aty, 0);
  if (worst(3, (i) => w0[i] - truth[i]) > 1e-10) bad.push('exact least squares missed');
  const wR = la.ridgeSolve(AtA, Aty, 5);
  const norm = (w) => Math.hypot(...w);
  if (!(norm(wR) < norm(w0))) bad.push('ridge does not shrink');
  // and continuity: λ → 0 gives back the least squares
  const wEps = la.ridgeSolve(AtA, Aty, 1e-9);
  if (worst(3, (i) => wEps[i] - w0[i]) > 1e-6) bad.push('ridge discontinue en 0');
  // the inputs are NOT modified: two calls give the same result
  const again = la.ridgeSolve(AtA, Aty, 0);
  if (worst(3, (i) => again[i] - w0[i]) > 0) bad.push('ridgeSolve modifies its inputs');

  console.log(`  ${dim('linalg')}`);
  if (bad.length) {
    for (const b2 of bad) console.log(`    ${red('✗')} ${b2}`);
    fail++;
  } else {
    console.log(
      `    ${green('✓')} matvec, xᵀRx = Σλ⟨v,x⟩², VᵀV = I, Rv = λv, solve(A,Ax) = x, ridge exact and continuous at 0`
    );
    pass++;
  }
}

/**
 * The URL contract (core/router.js), which is the ONE contract nothing else can
 * catch. A wrong formula fails a numeric check; a wrong URL cast produces a
 * plausible plot of the wrong thing, in bounds, with nobody to object.
 *
 * The header of router.js promises that an out-of-bounds or unparsable value
 * "silently falls back to the default (a hand-edited URL must never produce an
 * invalid state or a crash)". That promise had never been tested, and it was
 * half true: nothing crashed, but `parseFloat`/`parseInt` stop at the first
 * unreadable character, so '12abc' decoded to 12 and '0x10' to 0 instead of
 * falling back. Pinned here, both halves.
 *
 * Also pinned: encode → decode is the identity on every param type. That is
 * "one link = one reproducible scene" written as an equation, and it is the
 * reason the whole instrument can be driven by a URL.
 */
function checkRouter() {
  const bad = [];
  const N = { type: 'int', min: 2, max: 200 };
  const A = { type: 'float', min: 0, max: 2 };
  const SNR = { type: 'log', min: 1e-3, max: 1e3 };
  const B = { type: 'bool' };
  const S = { type: 'select', options: [{ value: false }, { value: true }] };
  const C = { type: 'coeffs', maxLen: 4 };

  // ACCEPTED: what a lecturer legitimately types, exponents and signs included
  for (const [spec, str, want] of [
    [N, '30', 30],
    [N, ' 7 ', 7],
    [A, '0.5', 0.5],
    [A, '.5', 0.5],
    [A, '+1.5', 1.5],
    [SNR, '1e-3', 1e-3],
    [B, 'true', true],
    [B, 'false', false],
    [S, 'false', false],
  ]) {
    const got = castParam(spec, str);
    if (got !== want) bad.push(`'${str}' → ${JSON.stringify(got)}, expected ${want}`);
  }
  const coeffs = castParam(C, '1,-2.5,1e2');
  if (String(coeffs) !== '1,-2.5,100') bad.push(`coeffs '1,-2.5,1e2' → ${coeffs}`);

  // REJECTED: everything else falls back to the default (undefined), and the
  // first three are the regressions this check exists for
  for (const [spec, str] of [
    [N, '12abc'],
    [A, '0.5abc'],
    [A, '0x10'],
    [N, ''],
    [A, ''],
    [A, 'Infinity'],
    [A, 'NaN'],
    [N, '30.7'],
    [N, '1'], // below min
    [A, '9'], // above max
    [B, 'TRUE'],
    [B, '1'],
    [S, 'maybe'],
    [C, '1,,2'],
    [C, '1,0x10'],
    [C, '1,2,3,4,5'], // longer than maxLen
  ]) {
    const got = castParam(spec, str);
    if (got !== undefined) bad.push(`'${str}' → ${JSON.stringify(got)}, expected fallback`);
  }

  // NEVER THROWS: a truncated or mangled hash is a state, not a crash
  for (const h of ['', '#', '#/', '#/a/b?', '#/a/b?=&&x', '#/a/b?N=%E0%A4%A', '#///']) {
    try {
      parseHash(h);
    } catch (e) {
      bad.push(`parseHash('${h}') threw ${e.message}`);
    }
  }

  // encode → decode = identity, on every type at once
  const specs = { N, A, SNR, B, S, C };
  const params = { N: 30, A: 0.3, SNR: 0.001, B: true, S: false, C: [1, -2.5] };
  const manifest = {
    params: specs,
    presets: [{ id: 'scene-2' }],
    views: [{ id: 'time' }, { id: 'spectrum' }],
  };
  const hash = encodeHash('stats/demo', {
    params,
    base: {}, // nothing equals its base, so every param is serialized
    paramSpecs: specs,
    view: 'spectrum',
    defaultView: 'time',
    preset: 'scene-2',
    defaultPreset: 'scene-1',
    drawer: true,
    defaultDrawer: false,
  });
  const { path, query } = parseHash(hash);
  if (path !== 'stats/demo') bad.push(`round trip: path '${path}'`);
  const back = decodeQuery(query, manifest);
  for (const k of Object.keys(params)) {
    const a = String(params[k]);
    const b = String(back.params[k]);
    if (a !== b) bad.push(`round trip ${k}: ${a} → ${b}`);
  }
  if (back.view !== 'spectrum') bad.push(`round trip view: ${back.view}`);
  if (back.preset !== 'scene-2') bad.push(`round trip preset: ${back.preset}`);
  if (back.drawer !== true) bad.push(`round trip drawer: ${back.drawer}`);

  // and a hash pointing at a view/preset that no longer exists is dropped,
  // not carried into the app as a dangling id
  const stale = decodeQuery({ view: 'gone', preset: 'gone' }, manifest);
  if ('view' in stale || 'preset' in stale) bad.push('stale view/preset survived decode');

  console.log(`  ${dim('url')}`);
  if (bad.length) {
    for (const b of bad) console.log(`    ${red('✗')} ${b}`);
    fail++;
  } else {
    console.log(
      `    ${green('✓')} strict casts, fallback on anything unparsable, parseHash never throws, encode∘decode = id`
    );
    pass++;
  }
}

/**
 * The catalogue's ORDER, checked rather than trusted.
 *
 * `order` is what makes the sidebar and the palette read a subject in the
 * order the course meets its demos, and it is the one declarative key with no
 * validation anywhere: fields, views, figures and scenes all throw at load
 * time, `order` was a bare number nobody looked at. Two experiments claiming
 * rank 2 do not fail — they sort by whatever the engine happens to do, which
 * is exactly the failure the project refuses elsewhere ("a typo is caught at
 * load time, never silently ignored"). This check exists because the ML
 * subject had shipped with two 1s and two 2s.
 *
 * An ABSENT order stays legal, and deliberately so (CLAUDE.md: the experiment
 * lands at the end of its subject, alphabetically, so adding one modifies
 * nothing else). What is refused is a declared rank that is not a positive
 * integer, and two siblings claiming the same one.
 */
function checkOrdering(subjectRanks, expRanks) {
  const bad = [];
  const scan = (label, entries) => {
    const seen = new Map();
    for (const [name, order] of entries) {
      if (order === undefined) continue;
      if (!Number.isInteger(order) || order < 1) {
        bad.push(`${label}${name}: order ${JSON.stringify(order)} is not a positive integer`);
        continue;
      }
      if (seen.has(order)) bad.push(`${label}{${seen.get(order)}, ${name}} both claim order ${order}`);
      else seen.set(order, name);
    }
  };
  scan('', subjectRanks);
  for (const [sub, entries] of expRanks) scan(`${sub}/`, entries);

  console.log(`  ${dim('order')}`);
  if (bad.length) {
    for (const b of bad) console.log(`    ${red('✗')} ${b}`);
    fail++;
  } else {
    const n = [...expRanks.values()].reduce((s, e) => s + e.length, 0);
    console.log(
      `    ${green('✓')} every declared rank is unique inside its subject  ` +
        `${dim(`(${subjectRanks.length} subjects, ${n} experiments)`)}`
    );
    pass++;
  }
}

async function checkCatalogue() {
  console.log(bold('catalogue'));
  checkLayering();
  checkRandomness();
  checkDsp();
  checkLinalg();
  checkMedian();
  checkRouter();
  console.log(`  ${dim('vocabulary')}`);
  let figuresOk = true;
  let scenesOk = true;
  const axisBad = [];
  let nViews = 0;
  let nScenes = 0;
  const subjectRanks = [];
  const expRanks = new Map();
  for (const sub of readdirSync(ROOT, { withFileTypes: true })) {
    if (!sub.isDirectory()) continue;
    const dir = join(ROOT, sub.name);
    const subjectFile = join(dir, '_subject.js');
    const subject = existsSync(subjectFile)
      ? (await import(pathToFileURL(subjectFile).href)).default
      : {};
    subjectRanks.push([sub.name, subject.order]);
    expRanks.set(sub.name, []);
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
      expRanks.get(sub.name).push([exp.name, manifest.order]);
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
  checkOrdering(subjectRanks, expRanks);
  console.log(`  ${dim('axes')}`);
  if (axisBad.length) {
    for (const b of axisBad) console.log(`    ${red('✗')} ${b}`);
    fail++;
  } else {
    console.log(`    ${green('✓')} every declarative axis carries a name`);
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
