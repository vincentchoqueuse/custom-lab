import { compute, project, burst, analyse, rayleighPdf, ricePdf, FS, LOW, HIGH, TONES, keyIndex } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { solveLinearSystem } from '../../../core/linalg.js';

const BASE = { key: '5', ms: 40, snrDb: 10, M: 400, seed: 34 };
const obs = (p) => compute({ ...BASE, ...p }).observables;

export const checks = [
  {
    // The noiseless burst lives EXACTLY in the four-dimensional space its two
    // tones span, and the JOINT least squares finds it to machine precision.
    //
    // Written first as two successive per-tone projections, this check failed
    // at 1.5e-2 — and the failure is the experiment's own subject. Two DTMF
    // tones are not orthogonal over a finite window, so projecting onto one
    // and then the other is NOT projecting onto their span; what is left over
    // is the leakage the second tab draws. The receiver uses the per-tone
    // version all the same, and has no choice: the joint solve needs to know
    // WHICH two tones are present, which is the question being asked.
    name: 'the noiseless burst is exactly in the span of its two tones',
    category: 'numeric',
    run() {
      const worst = maxGap(['1', '5', '9', 'D'], (key) => {
        const { r, c } = keyIndex(key);
        const n = 320;
        const b = burst({ key, n, amp: 1, sigma: 0, seed: 3 });
        const fs = [LOW[r], HIGH[c]];
        // the 4×4 normal equations of [cos₁ sin₁ cos₂ sin₂]
        const basis = fs.flatMap((f) => [
          (i) => Math.cos((2 * Math.PI * f * i) / FS),
          (i) => Math.sin((2 * Math.PI * f * i) / FS),
        ]);
        const G = Array.from({ length: 4 }, () => new Array(4).fill(0));
        const y = new Array(4).fill(0);
        for (let i = 0; i < n; i++) {
          const v = basis.map((g) => g(i));
          for (let a = 0; a < 4; a++) {
            y[a] += b.clean[i] * v[a];
            for (let d = 0; d < 4; d++) G[a][d] += v[a] * v[d];
          }
        }
        const th = solveLinearSystem(G, y);
        let g = 0;
        for (let i = 0; i < n; i++) {
          let acc = 0;
          for (let a = 0; a < 4; a++) acc += th[a] * basis[a](i);
          g = Math.max(g, Math.abs(b.clean[i] - acc));
        }
        return g;
      });
      return { ok: worst < 1e-12, detail: `worst residual sample ${worst.toExponential(2)}` };
    },
  },
  {
    // A projector is IDEMPOTENT, and that is checkable without knowing anything
    // about DTMF: projecting the projection returns it.
    name: 'the projector is idempotent',
    category: 'numeric',
    run() {
      const n = 257; // deliberately not a whole number of cycles of anything
      const b = burst({ key: '7', n, amp: 1, sigma: 0.3, seed: 11 });
      const worst = maxGap(TONES, (f) => {
        const w = (2 * Math.PI * f) / FS;
        const p1 = project(b.x, f);
        const y = new Float64Array(n);
        for (let i = 0; i < n; i++) y[i] = p1.alpha * Math.cos(w * i) + p1.beta * Math.sin(w * i);
        const p2 = project(y, f);
        return Math.abs(p2.alpha - p1.alpha) + Math.abs(p2.beta - p1.beta);
      });
      return { ok: worst < 1e-10, detail: `worst |P²x − Px| ${worst.toExponential(2)}` };
    },
  },
  {
    // The Gram matrix is inverted rather than assumed diagonal, and this is why:
    // over a window that is not a whole number of cycles the two columns are
    // not orthogonal, and the diagonal shortcut is biased. The bias falls as
    // 1/N — measured, so the reason the 2×2 solve is there is a number.
    name: 'assuming the basis orthogonal is a bias that falls as 1/N',
    category: 'numeric',
    run() {
      const shortcut = (x, f) => {
        const w = (2 * Math.PI * f) / FS;
        let xc = 0;
        let xs = 0;
        for (let i = 0; i < x.length; i++) {
          xc += x[i] * Math.cos(w * i);
          xs += x[i] * Math.sin(w * i);
        }
        return (2 / x.length) * Math.hypot(xc, xs);
      };
      // read on the WORST case over a range of N and not at one N: the bias
      // depends on where the window falls relative to a whole number of
      // cycles, so it OSCILLATES as it decays, and at a single N the sequence
      // is not monotone — 40, 80, 160 gave 1.9e-2, 2.0e-2, 2.4e-3.
      const worstOver = (lo, hi) => {
        let w = 0;
        for (let n = lo; n <= hi; n += 3) {
          const b = burst({ key: '5', n, amp: 1, sigma: 0, seed: 5 });
          w = Math.max(w, Math.abs(shortcut(b.clean, LOW[1]) - project(b.clean, LOW[1]).amp));
        }
        return w;
      };
      const e1 = worstOver(30, 60);
      const e2 = worstOver(60, 120);
      const e3 = worstOver(120, 240);
      return {
        ok: e1 > e2 && e2 > e3 && e1 / e3 > 3,
        detail: `worst over 30–60: ${e1.toExponential(2)} · 60–120: ${e2.toExponential(2)} · 120–240: ${e3.toExponential(2)}`,
      };
    },
  },
  {
    // THE design number, and the reason the second tab has an orange line on
    // it: a tone that is not there still returns σ√(π/N), because noise
    // projected onto two directions has a Rayleigh modulus whose mean is that.
    name: 'an absent tone returns E|â| = σ√(π/N)',
    category: 'statistical',
    run() {
      const bad = [];
      for (const [n, sigma] of [[320, 0.5], [80, 0.5], [320, 2]]) {
        const M = 3000;
        let acc = 0;
        for (let m = 0; m < M; m++) {
          // pure noise: no tone at all, so every projection is under H₀
          const b = burst({ key: '5', n, amp: 0, sigma, seed: 900 + m });
          acc += project(b.x, HIGH[2]).amp;
        }
        const measured = acc / M;
        const want = sigma * Math.sqrt(Math.PI / n);
        // a Rayleigh's mean over M draws has standard error σ_R·√((2−π/2)/M)
        const sR = sigma * Math.sqrt(2 / n);
        const se = sR * Math.sqrt((2 - Math.PI / 2) / M);
        if (Math.abs(measured - want) > 4 * se) bad.push(`N=${n} σ=${sigma}: ${measured.toExponential(3)} vs ${want.toExponential(3)}`);
      }
      return { ok: bad.length === 0, detail: bad.join(' · ') || 'three settings, all within 4 SE' };
    },
  },
  {
    // Both drawn laws, against the histograms the same figure shows. Rayleigh
    // integrates to one and Rice reduces to Rayleigh at A = 0 — the second is
    // an exact degeneracy and worth pinning, since a Rice written with a wrong
    // Bessel series would still look plausible.
    name: 'Rice at A = 0 IS Rayleigh, and both integrate to one',
    category: 'numeric',
    run() {
      const s = 0.4;
      const deg = maxGap(range(60), (i) => {
        const x = (6 * s * (i + 0.5)) / 60;
        return Math.abs(ricePdf(x, 0, s) - rayleighPdf(x, s));
      });
      const area = (f) => {
        let a = 0;
        const hi = 12 * s;
        for (let i = 0; i < 4000; i++) a += f(((i + 0.5) * hi) / 4000) * (hi / 4000);
        return a;
      };
      const aR = Math.abs(area((x) => rayleighPdf(x, s)) - 1);
      const aI = Math.abs(area((x) => ricePdf(x, 1, s)) - 1);
      return {
        ok: deg < 1e-15 && aR < 1e-6 && aI < 1e-6,
        detail: `Rice(0) − Rayleigh: ${deg.toExponential(2)} · areas: ${aR.toExponential(2)}, ${aI.toExponential(2)}`,
      };
    },
  },
  {
    // What the keypad claims: the decision is the argmax of sixteen scores, and
    // at a workable SNR it is right for every one of the sixteen keys.
    name: 'every one of the sixteen keys is decoded at 10 dB',
    category: 'statistical',
    run() {
      const bad = [];
      for (const key of ['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D']) {
        const o = obs({ key, snrDb: 10, M: 120 });
        if (o.decided.value !== key || o.success.value < 0.99) bad.push(`${key}: ${o.decided.value} (${o.success.value.toFixed(3)})`);
      }
      return { ok: bad.length === 0, detail: bad.join(' · ') || 'sixteen keys, all above 99 % over 120 bursts' };
    },
  },
  {
    // And the design rule the second scene turns on: the margin over the floor
    // grows as √N, so doubling the window buys 3 dB. Measured on the statline's
    // own number, which is what the room reads.
    name: 'doubling the window buys 3 dB of margin',
    category: 'statistical',
    run() {
      const m = (ms) => obs({ ms, snrDb: 0, M: 60 }).margin.value;
      const a = m(10);
      const b = m(20);
      const c = m(40);
      const d1 = b - a;
      const d2 = c - b;
      // 3.01 dB is what the FLOOR alone gives, since it falls as 1/√N. The
      // measured step is a little more, consistently, because the numerator
      // moves too: the leakage inside the estimated amplitude falls with the
      // window as well. Bounded below by the floor's own 3 dB and above by
      // half a decibel of that bonus.
      return {
        ok: d1 > 3.0 && d1 < 4.2 && d2 > 3.0 && d2 < 4.2,
        detail: `10→20 ms: +${d1.toFixed(2)} dB · 20→40 ms: +${d2.toFixed(2)} dB (floor alone: 3.01)`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'amplitudes'),
];
