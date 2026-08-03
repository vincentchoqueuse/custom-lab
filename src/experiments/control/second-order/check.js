import { compute } from './compute.js';
import { secondOrderStep as stepValue, secondOrderImpulse as impulseValue } from '../_lib/lti.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const BASE = { K: 1, m: 0.3, w0: 2, seed: 34 };

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
    name: '|H(jω₀)| = K/(2m) et arg H(jω₀) = −90° exactement (le centre EST ω₀)',
    category: 'numeric',
    run() {
      // the curve is stored in dB now, so the identity is asserted against
      // 20·log₁₀(K/2m); the phase at ω₀ is −90° whatever m, which is the
      // reading the new Bode — phase view exists for
      const { observables: o } = compute({ ...BASE, K: 1.5, m: 0.25 });
      const mid = (o.gain.x.length - 1) / 2;
      const err = Math.max(
        Math.abs(o.gain.y[mid] - 20 * Math.log10(1.5 / (2 * 0.25))),
        Math.abs(o.phase.y[mid] + 90)
      );
      const anyM = [0.05, 0.3, 0.707, 1.4].every((m) => {
        const p = compute({ ...BASE, m }).observables;
        return Math.abs(p.phase.y[(p.phase.x.length - 1) / 2] + 90) < 1e-12;
      });
      return { ok: err < 1e-12 && anyM, detail: `|Δ|=${err.toExponential(2)}, −90° à ω₀ pour tout m` };
    },
  },
  {
    name: 'la phase part de 0° et finit à −180° (deux pôles, deux fois −90°)',
    category: 'numeric',
    run() {
      // what a first order can never do, and the reason a second order can
      // destabilise a loop: the phase reaches −180°, monotonically
      const gap = maxGap([0.1, 0.5, 1, 1.8], (m) => {
        const o = compute({ ...BASE, m }).observables;
        const n = o.phase.y.length - 1;
        let mono = 0;
        for (let i = 1; i <= n; i++) mono = Math.max(mono, o.phase.y[i] - o.phase.y[i - 1]);
        // ±1.5 decades: the ends approach 0° and −180° without reaching them
        return Math.max(mono, o.phase.y[0] > 0 ? 1 : 0, o.phase.y[n] < -180 ? 1 : 0);
      });
      const o = compute({ ...BASE, m: 0.3 }).observables;
      return {
        ok: gap <= 0,
        detail: `phase ${o.phase.y[0].toFixed(2)}° → ${o.phase.y[o.phase.y.length - 1].toFixed(2)}°, monotone`,
      };
    },
  },
  {
    name: 'resonance peak: argmax|H| ≈ ω₀√(1−2m²), gone at m = 0.8',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, m: 0.3 });
      let iMax = 0;
      for (let i = 1; i < o.gain.y.length; i++) {
        if (o.gain.y[i] > o.gain.y[iMax]) iMax = i;
      }
      const wrTh = 2 * Math.sqrt(1 - 2 * 0.09);
      const peakOk = Math.abs(o.gain.x[iMax] - wrTh) / wrTh < 0.15; // log-grid step
      const o2 = compute({ ...BASE, m: 0.8 }).observables;
      let flat = true;
      for (let i = 1; i < o2.gain.y.length; i++) {
        if (o2.gain.y[i] > 1e-9) flat = false; // 0 dB = the static gain K = 1
      }
      return { ok: peakOk && flat, detail: `argmax=${o.gain.x[iMax].toFixed(2)} ≈ ${wrTh.toFixed(2)}` };
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
  {
    name: 'h(t) est la dérivée de y(t), dans les trois régimes',
    category: 'numeric',
    run() {
      // central difference on the step response against the closed-form
      // impulse response — two independent derivations of the same system,
      // checked on both sides of the critical damping
      const dt = 1e-6;
      const gap = maxGap([0.25, 1, 2.5], (m) =>
        maxGap(
          range(30, (i) => 0.05 + i * 0.12),
          (t) => (stepValue(1.3, m, 2.2, t + dt) - stepValue(1.3, m, 2.2, t - dt)) / (2 * dt),
          (t) => impulseValue(1.3, m, 2.2, t)
        )
      );
      return { ok: gap < 1e-7, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'impulsionnelle : premier passage par zéro à T_d/2 (m < 1)',
    category: 'numeric',
    run() {
      // h ∝ sin(ω_d t): the zeros are at multiples of π/ω_d, exactly
      const gap = maxGap([0.1, 0.4, 0.7], (m) => {
        const wd = 2.2 * Math.sqrt(1 - m * m);
        return impulseValue(1, m, 2.2, Math.PI / wd);
      });
      return { ok: gap < 1e-15, detail: `|h(T_d/2)| max ${gap.toExponential(2)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'stepResponse'),
];
