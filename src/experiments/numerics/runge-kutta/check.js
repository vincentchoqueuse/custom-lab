import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { system: 'linear', h: 0.1, theta0: 2.5, seed: 42 };

function slope(o, key) {
  // log-log fit between the two ends of the clean part of the h grid
  const { x, y } = o[key];
  return Math.log(y[4] / y[1]) / Math.log(x[4] / x[1]); // h = 0.01 … 0.08
}

export const checks = [
  {
    name: 'measured orders on the exact linear system: 1, 2 and 4',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const s1 = slope(o, 'errEuler');
      const s2 = slope(o, 'errRK2');
      const s4 = slope(o, 'errRK4');
      const ok = Math.abs(s1 - 1) < 0.15 && Math.abs(s2 - 2) < 0.15 && Math.abs(s4 - 4) < 0.2;
      return { ok, detail: `pentes = ${s1.toFixed(2)}, ${s2.toFixed(2)}, ${s4.toFixed(2)}` };
    },
  },
  {
    name: 'RK4 at h = 0.01 matches the exact damped solution to 1e-8',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      // errRK4 grid point at h = 0.01 is index 1
      return {
        ok: o.errRK4.y[1] < 1e-8,
        detail: `err=${o.errRK4.y[1].toExponential(2)}`,
      };
    },
  },
  {
    name: 'pendulum energy: Euler inflates it, RK4 holds it (h = 0.1)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, system: 'pendulum' });
      const eulerGrows = o.driftEuler.value > 1.2;
      const rk4Holds = Math.abs(o.driftRK4.value - 1) < 1e-3;
      return {
        ok: eulerGrows && rk4Holds,
        detail: `Euler E(T)/E₀=${o.driftEuler.value.toFixed(2)}, RK4=${o.driftRK4.value.toFixed(5)}`,
      };
    },
  },
  {
    name: 'small-angle pendulum period ≈ 2π(1 + θ₀²/16) (RK4, fine step)',
    category: 'numeric',
    run() {
      const theta0 = 0.4;
      const { observables: o } = compute({ ...BASE, system: 'pendulum', theta0, h: 0.005 });
      // period from the RK4 trajectory: time between downward zero crossings
      const { x, y } = o.trajRK4;
      const crossings = [];
      for (let i = 1; i < y.length; i++) {
        if (y[i - 1] > 0 && y[i] <= 0) {
          crossings.push(x[i - 1] + ((x[i] - x[i - 1]) * y[i - 1]) / (y[i - 1] - y[i]));
        }
      }
      const period = (crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1);
      const th = 2 * Math.PI * (1 + theta0 ** 2 / 16);
      const rel = Math.abs(period - th) / th;
      return { ok: rel < 2e-3, detail: `T=${period.toFixed(4)} ≈ ${th.toFixed(4)}` };
    },
  },
  {
    name: 'error hierarchy at every grid step: Euler ≥ RK2 ≥ RK4',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let ok = true;
      for (let g = 0; g < o.errEuler.x.length; g++) {
        if (o.errEuler.y[g] < o.errRK2.y[g] || o.errRK2.y[g] < o.errRK4.y[g]) ok = false;
      }
      return { ok, detail: `${o.errEuler.x.length} valeurs de h` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'trajRK4'),
];
