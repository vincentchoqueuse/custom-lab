import { compute, xOf, X0, energyOf } from './compute.js';
import { standardChecks, maxGap, maxAbsDiff, range } from '../../../core/checks.js';
import { sinc } from '../../../core/numeric.js';

// The catalogue claims seven closed-form transforms; the harness earns them by
// integrating ∫x(t)e^{−j2πft}dt numerically and confronting the two. Simpson
// over each signal's NATURAL support (endpoints on the boundary, a node on
// every kink) makes that integral exact to ~1e-15 for everything except the
// sinus cardinal, whose 1/t tails no finite quadrature resolves — it is
// checked by its energy instead, with the truncation error stated.

const T0 = 0.005; // 5 ms
const F0 = 600; // carrier of the truncated sinusoid

/** Natural support of each signal (the sinc has none: it is excluded). */
const SUPPORT = {
  rect: (T) => [-T / 2, T / 2],
  triangle: (T) => [-T, T],
  gauss: (T) => [-8 * T, 8 * T],
  expo: (T) => [0, 30 * T],
  expo2: (T) => [-30 * T, 30 * T],
  rf: (T) => [-T / 2, T / 2],
};

/** Simpson step for the transforms: h = T/5000 whatever the support width, so
 *  the wide supports (±30T for the exponentials) stay as accurate as the gate. */
const stepsFor = (a, b, T) => 2 * Math.ceil(((b - a) / T) * 2500);

/** Composite Simpson (n even, so every kink at the middle is a panel edge). */
function simpson(g, a, b, n = 20000) {
  const h = (b - a) / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
    s += w * g(a + i * h);
  }
  return (s * h) / 3;
}

/** ∫ x(t)·e^{−j2πft} dt over the support — the transform, the hard way. */
function fourierIntegral(signal, f, T, f0) {
  const [a, b] = SUPPORT[signal](T);
  const n = stepsFor(a, b, T);
  const re = simpson((u) => xOf(signal, u, T, f0) * Math.cos(2 * Math.PI * f * u), a, b, n);
  const im = simpson((u) => -xOf(signal, u, T, f0) * Math.sin(2 * Math.PI * f * u), a, b, n);
  return [re, im];
}

/** Phase samples keyed by frequency (the drawn series carries NaN wraps). */
function phaseByFreq(o) {
  const m = new Map();
  for (let i = 0; i < o.x.length; i++) if (Number.isFinite(o.x[i])) m.set(o.x[i], o.y[i]);
  return m;
}

const wrap = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
const run = (p) => compute({ signal: 'rect', T: 5, f0: F0, t0: 0, seed: 1, ...p }).observables;

export const checks = [
  {
    name: 'transformées : intégrale de Fourier numérique = forme fermée',
    category: 'numeric',
    run() {
      // frequencies spread over the displayed band, offset so none lands on a
      // zero of the transform (where a relative gap would be meaningless)
      const fs = [0, 0.31, 0.73, 1.47, 2.63, 3.91];
      let worst = 0;
      let where = '';
      for (const signal of Object.keys(SUPPORT)) {
        const shift = signal === 'rf' ? F0 : 0;
        const gap = maxGap(fs, (u) => {
          const f = shift + u / T0;
          const [nr, ni] = fourierIntegral(signal, f, T0, F0);
          const [cr, ci] = X0(signal, f, T0, F0);
          return Math.hypot(nr - cr, ni - ci) / T0; // relative to the T scale
        });
        if (gap > worst) {
          worst = gap;
          where = signal;
        }
      }
      return { ok: worst < 1e-9, detail: `écart max ${worst.toExponential(1)} (${where})` };
    },
  },
  {
    name: 'énergies : ∫x²(t)dt = forme fermée',
    category: 'numeric',
    run() {
      const gap = maxGap(Object.keys(SUPPORT), (signal) => {
        const [a, b] = SUPPORT[signal](T0);
        const e = simpson((u) => xOf(signal, u, T0, F0) ** 2, a, b);
        return Math.abs(e - energyOf(signal, T0, F0)) / T0;
      });
      return { ok: gap < 1e-9, detail: `écart relatif max ${gap.toExponential(1)}` };
    },
  },
  {
    name: 'sinus cardinal : ∫sinc²(t/T)dt = T (queues en 1/t², ±200T)',
    category: 'numeric',
    run() {
      // The only signal without a natural support: truncating at ±200T leaves
      // ≈ T/(200π²) ≈ 5e-4·T in the tails. Documented, not hidden.
      const e = simpson((u) => xOf('sinc', u, T0, F0) ** 2, -200 * T0, 200 * T0, 400000);
      const rel = Math.abs(e - T0) / T0;
      return { ok: rel < 2e-3, detail: `écart ${(100 * rel).toFixed(3)} %` };
    },
  },
  {
    name: 'Parseval : ∫|X(f)|²df = énergie du signal',
    category: 'numeric',
    run() {
      // 1/f² spectra (porte, exponentielle causale) leave ~3e-4·T beyond
      // ±300/T. The sinc is integrated over its exact band; its tolerance pays
      // for the Dirichlet half-value at the band edge, which one Simpson
      // endpoint weight turns into a ~h·T/2 bias — quadrature, not physics.
      const tol = { rect: 1e-3, triangle: 1e-6, gauss: 1e-12, expo: 1e-3, expo2: 1e-6, sinc: 1e-5, rf: 1e-3 };
      let worst = 0;
      let where = '';
      for (const signal of Object.keys(tol)) {
        const F = signal === 'sinc' ? 0.5 / T0 : 300 / T0 + (signal === 'rf' ? F0 : 0);
        const e = simpson((f) => X0(signal, f, T0, F0).reduce((s, v) => s + v * v, 0), -F, F, 400000);
        const rel = Math.abs(e - energyOf(signal, T0, F0)) / T0;
        if (rel > tol[signal]) return { ok: false, detail: `${signal}: écart ${rel.toExponential(1)}` };
        if (rel > worst) {
          worst = rel;
          where = signal;
        }
      }
      return { ok: true, detail: `écart max ${worst.toExponential(1)} (${where})` };
    },
  },
  {
    name: 'un retard ne change pas |X(f)| — à l’identique',
    category: 'numeric',
    run() {
      const a = run({ signal: 'expo', t0: 0 }).mag.y;
      const b = run({ signal: 'expo', t0: 3.7 }).mag.y;
      const gap = maxAbsDiff(a, b);
      return { ok: gap === 0, detail: `écart ${gap} sur ${a.length} points` };
    },
  },
  {
    name: 'un retard ajoute exactement −2πft₀ à la phase',
    category: 'numeric',
    run() {
      const t0ms = 2;
      const p0 = phaseByFreq(run({ signal: 'expo', t0: 0 }).phase);
      const p1 = phaseByFreq(run({ signal: 'expo', t0: t0ms }).phase);
      const fs = [...p0.keys()].filter((f) => p1.has(f));
      const gap = maxGap(fs, (f) => wrap(p1.get(f) - p0.get(f) + 2 * Math.PI * f * (t0ms / 1000)));
      return { ok: gap < 1e-9, detail: `écart max ${gap.toExponential(1)} rad sur ${fs.length} points` };
    },
  },
  {
    name: 'bandes à −3 dB : formes fermées (exp, exp bilat., gaussienne, sinc)',
    category: 'numeric',
    run() {
      const expected = {
        expo: 1 / (2 * Math.PI * T0),
        expo2: Math.sqrt(Math.SQRT2 - 1) / (2 * Math.PI * T0),
        gauss: Math.sqrt(Math.LN2 / (2 * Math.PI)) / T0,
        sinc: 0.5 / T0,
      };
      const gap = maxGap(
        Object.keys(expected),
        (s) => (run({ signal: s }).b3.value - expected[s]) / expected[s]
      );
      return { ok: gap < 1e-9, detail: `écart relatif max ${gap.toExponential(1)}` };
    },
  },
  {
    name: 'invariance d’échelle : T·B₃ indépendant de T',
    category: 'numeric',
    run() {
      // The truncated sinusoid is excluded: at f₀T ≈ 2 its two lobes overlap,
      // so its width depends on f₀T as well — physics, not a bug.
      const signals = ['rect', 'triangle', 'gauss', 'expo', 'expo2', 'sinc'];
      const gap = maxGap(signals, (s) => {
        const a = run({ signal: s, T: 3 }).tb.value;
        const b = run({ signal: s, T: 11 }).tb.value;
        return (a - b) / a;
      });
      return { ok: gap < 1e-12, detail: `écart relatif max ${gap.toExponential(1)}` };
    },
  },
  {
    name: 'lobes secondaires : porte −13.26 dB, triangle exactement le double',
    category: 'numeric',
    run() {
      const r = run({ signal: 'rect' }).sidelobe.value;
      const t = run({ signal: 'triangle' }).sidelobe.value;
      const okR = Math.abs(r + 13.2615) < 0.02; // 20·log10(0.21723)
      const okT = Math.abs(t - 2 * r) < 1e-9; // sinc² ⇒ le dB double
      return {
        ok: okR && okT,
        detail: `porte ${r.toFixed(3)} dB, triangle ${t.toFixed(3)} dB`,
      };
    },
  },
  {
    name: 'premiers zéros : |X(1/T)| = 0 pour la porte et le triangle',
    category: 'numeric',
    run() {
      const gap = maxGap(['rect', 'triangle'], (s) => {
        const n0 = run({ signal: s }).firstNull.value;
        return Math.hypot(...X0(s, n0, T0, F0)) / T0;
      });
      return { ok: gap < 1e-15, detail: `|X| résiduel max ${gap.toExponential(1)}` };
    },
  },
  {
    name: 'modulation : le spectre de la porte, déplacé en f₀',
    category: 'numeric',
    run() {
      // |X_rf(f₀+δ)| = (T/2)|sinc(δT)| up to the cross term (T/2)sinc((2f₀+δ)T)
      const deltas = range(40, (i) => (i - 20) / (10 * T0));
      let worst = 0;
      let bound = 0;
      for (const d of deltas) {
        const got = Math.hypot(...X0('rf', F0 + d, T0, F0));
        const want = (T0 / 2) * Math.abs(sinc(d * T0));
        worst = Math.max(worst, Math.abs(got - want));
        bound = Math.max(bound, (T0 / 2) * Math.abs(sinc((2 * F0 + d) * T0)));
      }
      return {
        ok: worst <= bound + 1e-18,
        detail: `écart ${(worst / T0).toExponential(1)}·T ≤ terme croisé ${(bound / T0).toExponential(1)}·T`,
      };
    },
  },
  standardChecks.determinism(
    compute,
    { signal: 'rf', T: 5, f0: 600, t0: 1.5, seed: 7 },
    'mag'
  ),
];
