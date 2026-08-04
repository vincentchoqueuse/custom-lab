import { compute, coefficients, meanOf, idealValue } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const BASE = { wave: 'square', N: 10, A: 1, alpha: 0.25, seed: 34 };

/** aₙ = 2∫₀¹ x(t)cos(2πnt)dt, by Simpson over the pulse's exact support. */
function pulseCosineByQuadrature(A, alpha, n, steps = 20000) {
  const a = -alpha / 2;
  const b = alpha / 2;
  const h = (b - a) / steps;
  let s = 0;
  for (let i = 0; i <= steps; i++) {
    const w = i === 0 || i === steps ? 1 : i % 2 ? 4 : 2;
    s += w * A * Math.cos(2 * Math.PI * n * (a + i * h));
  }
  return (2 * s * h) / 3;
}

export const checks = [
  {
    name: 'square-wave coefficients are exactly 4A/(πn) on odd ranks',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let worst = 0;
      for (let i = 0; i < o.spectrum.x.length; i++) {
        const n = o.spectrum.x[i];
        const expected = n % 2 === 1 ? 4 / (Math.PI * n) : 0;
        worst = Math.max(worst, Math.abs(o.spectrum.y[i] - expected));
      }
      return { ok: worst < 1e-14, detail: `max|Δbₙ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'Parseval: tail energy at N=1 equals signal power minus b₁²/2',
    category: 'numeric',
    run() {
      // square power = A²; err(1)² = A² − (4A/π)²/2, up to the 2000-term cap
      const { observables: o } = compute({ ...BASE });
      const expected = Math.sqrt(1 - (4 / Math.PI) ** 2 / 2);
      const err = Math.abs(o.errorVsN.y[0] - expected);
      return { ok: err < 1e-3, detail: `|Δ|=${err.toExponential(2)}` };
    },
  },
  {
    name: 'time-domain RMS error matches the Parseval prediction (triangle)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, wave: 'triangle', N: 5 });
      // continuous signal: sampled RMS ≈ analytic tail closely
      const rel = Math.abs(o.rmsError.value - o.errorVsN.y[4]) / o.errorVsN.y[4];
      return { ok: rel < 0.05, detail: `rel Δ=${(rel * 100).toFixed(2)}%` };
    },
  },
  {
    name: 'Gibbs overshoot ≈ 8.95% at N = 60, independent of A',
    category: 'numeric',
    run() {
      const a = compute({ ...BASE, N: 60 }).observables.overshoot.value;
      const b = compute({ ...BASE, N: 60, A: 2 }).observables.overshoot.value;
      const ok = Math.abs(a - 8.95) < 1 && Math.abs(a - b) < 0.1;
      return { ok, detail: `overshoot=${a.toFixed(2)}% (A=1), ${b.toFixed(2)}% (A=2)` };
    },
  },
  {
    name: 'convergence slopes: triangle error falls ~N^(-3/2), square ~N^(-1/2)',
    category: 'numeric',
    run() {
      const slope = (o) => {
        const y = o.errorVsN.y;
        const x = o.errorVsN.x;
        // fit between N=10 and N=50 in log-log (odd-harmonic series are not
        // yet asymptotic at small N)
        return Math.log(y[49] / y[9]) / Math.log(x[49] / x[9]);
      };
      const sq = slope(compute({ ...BASE }).observables);
      const tr = slope(compute({ ...BASE, wave: 'triangle' }).observables);
      const ok = Math.abs(sq + 0.5) < 0.1 && Math.abs(tr + 1.5) < 0.1;
      return { ok, detail: `slope square=${sq.toFixed(2)}, triangle=${tr.toFixed(2)}` };
    },
  },
  {
    name: 'pulse train: aₙ = 2Aα·sinc(nα), by quadrature',
    category: 'numeric',
    run() {
      // the coefficient the experiment draws, confronted with the integral it
      // is supposed to be — Simpson over the exact support, so it is exact
      const gap = maxGap(
        range(24, (i) => i + 1),
        (n) => coefficients('pulse', 1.3, 0.31, n).a,
        (n) => pulseCosineByQuadrature(1.3, 0.31, n)
      );
      return { ok: gap < 1e-12, detail: `max|Δaₙ|=${gap.toExponential(2)}` };
    },
  },
  {
    name: 'zeros of the envelope: aₙ = 0 exactly at orders k/α',
    category: 'numeric',
    run() {
      // α = 1/8 ⇒ the ranks 8, 16, 24… are missing from the spectrum
      const gap = maxGap(
        range(6, (i) => 8 * (i + 1)),
        (n) => coefficients('pulse', 1, 0.125, n).a
      );
      return { ok: gap < 1e-15, detail: `max|a_{k/α}|=${gap.toExponential(2)}` };
    },
  },
  {
    name: 'α = 1/2: even orders vanish, odd ones at half the square wave',
    category: 'numeric',
    run() {
      // the pulse swings A where the ±A square swings 2A: exactly half
      const even = maxGap(range(15, (i) => 2 * (i + 1)), (n) => coefficients('pulse', 1, 0.5, n).a);
      const odd = maxGap(
        range(15, (i) => 2 * i + 1),
        (n) => Math.abs(coefficients('pulse', 1, 0.5, n).a),
        (n) => coefficients('square', 1, 0.5, n).b / 2
      );
      return {
        ok: even < 1e-15 && odd < 1e-15,
        detail: `pairs ${even.toExponential(1)}, impairs ${odd.toExponential(1)}`,
      };
    },
  },
  {
    name: 'Parseval sur le train d\'impulsions : a₀² + Σaₙ²/2 = A²α',
    category: 'numeric',
    run() {
      const A = 1;
      const alpha = 0.25;
      let p = meanOf('pulse', A, alpha) ** 2;
      for (let n = 1; n <= 200000; n++) p += coefficients('pulse', A, alpha, n).a ** 2 / 2;
      const rel = Math.abs(p - A * A * alpha) / (A * A * alpha);
      return { ok: rel < 1e-5, detail: `écart relatif ${rel.toExponential(2)}` };
    },
  },
  {
    name: 'valeur moyenne du train d\'impulsions = Aα (moyenne temporelle)',
    category: 'numeric',
    run() {
      // independent route: average the drawn signal over its two periods
      const { observables: o } = compute({ ...BASE, wave: 'pulse', alpha: 0.4, A: 1.5 });
      const mean = o.ideal.y.reduce((s, v) => s + v, 0) / o.ideal.y.length;
      const err = Math.abs(mean - o.dc.value);
      return { ok: err < 5e-3, detail: `moyenne=${mean.toFixed(4)}, a₀=${o.dc.value.toFixed(4)}` };
    },
  },
  {
    name: 'Gibbs : la constante ne dépend pas de la forme (carré et impulsions)',
    category: 'numeric',
    run() {
      const sq = compute({ ...BASE, N: 60 }).observables.overshoot.value;
      const pu = compute({ ...BASE, wave: 'pulse', alpha: 0.4, N: 60 }).observables.overshoot.value;
      return {
        ok: Math.abs(sq - 8.95) < 1 && Math.abs(pu - 8.95) < 1,
        detail: `carré ${sq.toFixed(2)} %, impulsions ${pu.toFixed(2)} %`,
      };
    },
  },
  {
    name: 'le signal tracé est bien un créneau de rapport cyclique α',
    category: 'numeric',
    run() {
      // fraction of the period spent at A, over a fine grid
      const alpha = 0.31;
      const n = 200001;
      let hi = 0;
      for (let i = 0; i < n; i++) hi += idealValue('pulse', 1, alpha, (i + 0.5) / n) === 1 ? 1 : 0;
      const duty = hi / n;
      return { ok: Math.abs(duty - alpha) < 1e-4, detail: `mesuré ${duty.toFixed(5)} vs ${alpha}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'reconstruction'),
  standardChecks.determinism(compute, { ...BASE, wave: 'pulse' }, 'spectrum'),
];
