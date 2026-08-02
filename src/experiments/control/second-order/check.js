import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { K: 1, m: 0.3, w0: 2, seed: 42 };

export const checks = [
  {
    name: 'overshoot matches e^(−mπ/√(1−m²)) on the sampled curve',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const err = Math.abs(o.overshoot.value - o.overshootTh.value);
      // grid resolution around the flat peak: sub-0.1% agreement expected
      return { ok: err < 0.1, detail: `${o.overshoot.value.toFixed(2)}% vs ${o.overshootTh.value.toFixed(2)}%` };
    },
  },
  {
    name: 'no overshoot in the aperiodic regime (m = 1.5), final value → K',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, m: 1.5, K: 1.4 });
      const last = o.stepResponse.y[o.stepResponse.y.length - 1];
      return {
        ok: o.overshoot.value < 1e-6 && Math.abs(last - 1.4) < 0.014,
        detail: `dépassement=${o.overshoot.value.toExponential(1)}, y(T)=${last.toFixed(3)}`,
      };
    },
  },
  {
    name: 'poles sit exactly on the ω₀ circle for m < 1',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, m: 0.6, w0: 5 });
      let worst = 0;
      for (let i = 0; i < 2; i++) {
        worst = Math.max(worst, Math.abs(Math.hypot(o.poles.x[i], o.poles.y[i]) - 5));
      }
      return { ok: worst < 1e-12, detail: `max||p|−ω₀|=${worst.toExponential(2)}` };
    },
  },
  {
    name: '|H(jω₀)| = K/(2m) exactly (grid center is ω₀)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, K: 1.5, m: 0.25 });
      const mid = (o.freqResponse.x.length - 1) / 2;
      const err = Math.abs(o.freqResponse.y[mid] - 1.5 / (2 * 0.25));
      return { ok: err < 1e-12, detail: `|Δ|=${err.toExponential(2)}` };
    },
  },
  {
    name: 'resonance peak: argmax|H| ≈ ω₀√(1−2m²), gone at m = 0.8',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, m: 0.3 });
      let iMax = 0;
      for (let i = 1; i < o.freqResponse.y.length; i++) {
        if (o.freqResponse.y[i] > o.freqResponse.y[iMax]) iMax = i;
      }
      const wrTh = 2 * Math.sqrt(1 - 2 * 0.09);
      const peakOk = Math.abs(o.freqResponse.x[iMax] - wrTh) / wrTh < 0.15; // log-grid step
      const o2 = compute({ ...BASE, m: 0.8 }).observables;
      let flat = true;
      for (let i = 1; i < o2.freqResponse.y.length; i++) {
        if (o2.freqResponse.y[i] > 1 + 1e-9) flat = false;
      }
      return { ok: peakOk && flat, detail: `argmax=${o.freqResponse.x[iMax].toFixed(2)} ≈ ${wrTh.toFixed(2)}` };
    },
  },
  {
    name: 'critical damping continuity: m = 1 ± ε give the same curve',
    category: 'numeric',
    run() {
      const a = compute({ ...BASE, m: 0.999999 }).observables.stepResponse;
      const b = compute({ ...BASE, m: 1.000001 }).observables.stepResponse;
      let worst = 0;
      for (let i = 0; i < a.y.length; i++) worst = Math.max(worst, Math.abs(a.y[i] - b.y[i]));
      return { ok: worst < 1e-4, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'stepResponse'),
];
