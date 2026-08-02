import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { Kp: 3, Ki: 1.5, Kd: 1, sigma: 0, seed: 42 };

export const checks = [
  {
    name: 'P alone: steady-state error equals 1/(1+Kp) (Kp = 2 and 5)',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const Kp of [2, 5]) {
        const { observables: o } = compute({ ...BASE, Kp, Ki: 0, Kd: 0 });
        worst = Math.max(worst, Math.abs(o.ess.value - 1 / (1 + Kp)));
      }
      return { ok: worst < 2e-3, detail: `max|Δ|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'the integrator kills both the static error and the load disturbance',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      return {
        ok: Math.abs(o.ess.value) < 2e-3 && o.rejection.value < 5e-3,
        detail: `ess=${o.ess.value.toExponential(1)}, |e| finale=${o.rejection.value.toExponential(1)}`,
      };
    },
  },
  {
    name: 'P alone never rejects the disturbance: final error stays offset',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, Kp: 3, Ki: 0, Kd: 0 });
      // load −0.5 through gain 1/(1+Kp): permanent offset 0.5/4 on top of ess
      return {
        ok: o.rejection.value > 0.3,
        detail: `|e| finale=${o.rejection.value.toFixed(3)} (attendu ≈ 0.375)`,
      };
    },
  },
  {
    name: 'derivative action tames the overshoot at high Kp',
    category: 'numeric',
    run() {
      const no = compute({ ...BASE, Kp: 6, Kd: 0 }).observables.overshoot.value;
      const yes = compute({ ...BASE, Kp: 6, Kd: 1.5 }).observables.overshoot.value;
      return { ok: yes < 0.5 * no, detail: `${yes.toFixed(1)}% < 0.5·${no.toFixed(1)}%` };
    },
  },
  {
    name: 'measurement noise + Kd blows up the command: σ(u) ratio > 5',
    category: 'statistical',
    run() {
      const quiet = compute({ ...BASE, sigma: 0.02, Kd: 0 }).observables.uStd.value;
      const loud = compute({ ...BASE, sigma: 0.02, Kd: 1.5 }).observables.uStd.value;
      return { ok: loud > 5 * quiet, detail: `σ(u): ${loud.toFixed(2)} vs ${quiet.toFixed(2)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'output'),
];
