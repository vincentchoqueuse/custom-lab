import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

export const checks = [
  {
    name: 'quantization error is bounded by Δ/2 (exact)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ b: 6, A: 0.9, f: 7.3, dither: false, seed: 1 });
      const bound = o.delta.value / 2 + 1e-12;
      return {
        ok: o.maxErr <= bound,
        detail: `max|e|=${o.maxErr.toExponential(3)} ≤ Δ/2=${(o.delta.value / 2).toExponential(3)}`,
      };
    },
  },
  {
    name: 'error power ≈ Δ²/12 when the uniform model holds (b = 10)',
    category: 'numeric',
    run() {
      // deterministic approximation, not a statistical fluctuation: at b = 10
      // with a non-round frequency the model is good to a few percent
      const { observables: o } = compute({ b: 10, A: 0.9, f: 7.3, dither: false, seed: 1 });
      const th = o.delta.value ** 2 / 12;
      const rel = Math.abs(o.errPower - th) / th;
      return { ok: rel < 0.05, detail: `P=${o.errPower.toExponential(3)} vs Δ²/12 (rel ${(rel * 100).toFixed(2)}%)` };
    },
  },
  {
    name: 'SNR gains 6.02 dB per bit (slope of the sweep, b = 6…12)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ b: 8, A: 0.9, f: 7.3, dither: false, seed: 1 });
      // least-squares slope over the asymptotic region
      const xs = [];
      const ys = [];
      for (let i = 0; i < o.snrCurve.x.length; i++) {
        if (o.snrCurve.x[i] >= 6 && o.snrCurve.x[i] <= 12) {
          xs.push(o.snrCurve.x[i]);
          ys.push(o.snrCurve.y[i]);
        }
      }
      const n = xs.length;
      const mx = xs.reduce((a, v) => a + v, 0) / n;
      const my = ys.reduce((a, v) => a + v, 0) / n;
      let num = 0;
      let den = 0;
      for (let i = 0; i < n; i++) {
        num += (xs[i] - mx) * (ys[i] - my);
        den += (xs[i] - mx) ** 2;
      }
      const slope = num / den;
      return { ok: Math.abs(slope - 6.02) < 0.15, detail: `slope=${slope.toFixed(3)} dB/bit` };
    },
  },
  {
    name: 'measured SNR matches the closed form at b = 8 (±0.5 dB)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ b: 8, A: 0.9, f: 7.3, dither: false, seed: 1 });
      const gap = Math.abs(o.snrMeas.value - o.snrTheory.value);
      return { ok: gap < 0.5, detail: `${o.snrMeas.value.toFixed(2)} vs ${o.snrTheory.value.toFixed(2)} dB` };
    },
  },
  {
    name: 'RPDF dither zeroes the mean error (first-moment property)',
    category: 'statistical',
    run() {
      // with dither the error std is ≈ Δ·√(1/6); SE of the mean over N
      // samples is std/√N, tolerance 4·SE (A = 0.8 keeps x + u off the clip)
      const { observables: o } = compute({ b: 4, A: 0.8, f: 7.3, dither: true, seed: 2 });
      const N = o.error.length;
      const se = (o.delta.value / Math.sqrt(6)) / Math.sqrt(N);
      return {
        ok: Math.abs(o.errMean) < 4 * se,
        detail: `mean=${o.errMean.toExponential(2)} (tol ${(4 * se).toExponential(2)})`,
      };
    },
  },
  standardChecks.determinism(compute, { b: 5, A: 0.9, f: 7.3, dither: true, seed: 7 }, 'error'),
];
