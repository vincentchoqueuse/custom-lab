// Euler, RK2 (midpoint) and RK4 integrate the same system at the same step:
//   pendule:      θ'' = −sin θ          (g/l = 1, undamped — energy must hold)
//   second ordre: y'' + 2mω₀y' + ω₀²y = 0, m = 0.2, ω₀ = 2 (exact solution)
// Observables: the trajectories against the exact/reference solution, the
// energy ratio E(t)/E₀ (Euler inflates it exponentially, RK4 holds it), and
// the global error at T versus h in log-log — the slope IS the order (1/2/4).
// Reference for the pendulum: RK4 at h/32 (no closed form).
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.

const T_END = 20; // s
const NG = 800; // display grid for the exact curve
const M2 = 0.2; // linear system: damping
const W2 = 2; // linear system: natural pulsation
const H_GRID = [0.005, 0.01, 0.02, 0.04, 0.08, 0.16, 0.32];

const FIELDS = {
  pendulum: (s) => [s[1], -Math.sin(s[0])],
  linear: (s) => [s[1], -2 * M2 * W2 * s[1] - W2 * W2 * s[0]],
};

function energyOf(system, s) {
  if (system === 'pendulum') return s[1] ** 2 / 2 + (1 - Math.cos(s[0]));
  return (s[1] ** 2 + (W2 * s[0]) ** 2) / 2;
}

function exactLinear(y0, t) {
  const wd = W2 * Math.sqrt(1 - M2 * M2);
  const e = Math.exp(-M2 * W2 * t);
  return y0 * e * (Math.cos(wd * t) + (M2 / Math.sqrt(1 - M2 * M2)) * Math.sin(wd * t));
}

const STEPPERS = {
  euler(f, s, h) {
    const k1 = f(s);
    return [s[0] + h * k1[0], s[1] + h * k1[1]];
  },
  rk2(f, s, h) {
    const k1 = f(s);
    const k2 = f([s[0] + (h / 2) * k1[0], s[1] + (h / 2) * k1[1]]);
    return [s[0] + h * k2[0], s[1] + h * k2[1]];
  },
  rk4(f, s, h) {
    const k1 = f(s);
    const k2 = f([s[0] + (h / 2) * k1[0], s[1] + (h / 2) * k1[1]]);
    const k3 = f([s[0] + (h / 2) * k2[0], s[1] + (h / 2) * k2[1]]);
    const k4 = f([s[0] + h * k3[0], s[1] + h * k3[1]]);
    return [
      s[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      s[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    ];
  },
};

/** Integrate to T_END; returns {t, y, energy} sampled at every step. */
function integrate(system, method, y0, h) {
  const f = FIELDS[system];
  const n = Math.round(T_END / h);
  const t = new Float64Array(n + 1);
  const y = new Float64Array(n + 1);
  const en = new Float64Array(n + 1);
  let s = [y0, 0];
  const e0 = energyOf(system, s);
  const CLAMP = 1e9;
  for (let i = 0; i <= n; i++) {
    t[i] = i * h;
    y[i] = s[0];
    en[i] = Math.max(energyOf(system, s) / e0, 1e-12);
    if (i === n) break;
    s = STEPPERS[method](f, s, h);
    if (!Number.isFinite(s[0]) || Math.abs(s[0]) > CLAMP) s[0] = CLAMP;
    if (!Number.isFinite(s[1]) || Math.abs(s[1]) > CLAMP) s[1] = CLAMP;
  }
  return { t, y, en, final: s };
}

// The error is measured at t ≈ T_ERR (grid-aligned), not at T_END: with the
// damped system both solutions have decayed to ~e⁻⁸ by 20 s and the
// comparison would leave the asymptotic O(hᵖ) regime.
const T_ERR = 5;

/** Reference value of y at t = steps·h: exact (linear) or RK4 at h/32. */
function referenceAt(system, y0, h, steps) {
  if (system === 'linear') return exactLinear(y0, steps * h);
  return integrate(system, 'rk4', y0, h / 32).y[steps * 32];
}

/**
 * @param {{system: string, h: number, theta0: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ system, h, theta0 }) {
  const y0 = system === 'pendulum' ? theta0 : 1;

  // exact/reference curve on a fine display grid
  const ref =
    system === 'linear'
      ? null
      : integrate(system, 'rk4', y0, Math.min(h / 32, 0.01));
  const gt = new Float64Array(NG);
  const gy = new Float64Array(NG);
  for (let i = 0; i < NG; i++) {
    gt[i] = (i * T_END) / (NG - 1);
    if (system === 'linear') {
      gy[i] = exactLinear(y0, gt[i]);
    } else {
      const idx = Math.min(ref.t.length - 1, Math.round(gt[i] / (ref.t[1] - ref.t[0])));
      gy[i] = ref.y[idx];
    }
  }

  const euler = integrate(system, 'euler', y0, h);
  const rk2 = integrate(system, 'rk2', y0, h);
  const rk4 = integrate(system, 'rk4', y0, h);

  // global error at T vs h, against the per-h reference
  const ex = new Float64Array(H_GRID.length);
  const e1 = new Float64Array(H_GRID.length);
  const e2 = new Float64Array(H_GRID.length);
  const e4 = new Float64Array(H_GRID.length);
  for (let g = 0; g < H_GRID.length; g++) {
    const hg = H_GRID[g];
    const steps = Math.round(T_ERR / hg);
    const target = referenceAt(system, y0, hg, steps);
    ex[g] = hg;
    e1[g] = Math.abs(integrate(system, 'euler', y0, hg).y[steps] - target);
    e2[g] = Math.abs(integrate(system, 'rk2', y0, hg).y[steps] - target);
    e4[g] = Math.abs(integrate(system, 'rk4', y0, hg).y[steps] - target);
  }

  return {
    observables: {
      trajExact: { x: gt, y: gy },
      trajEuler: { x: euler.t, y: euler.y },
      trajRK2: { x: rk2.t, y: rk2.y },
      trajRK4: { x: rk4.t, y: rk4.y },
      energyEuler: { x: euler.t, y: euler.en },
      energyRK2: { x: rk2.t, y: rk2.en },
      energyRK4: { x: rk4.t, y: rk4.en },
      errEuler: { x: ex, y: e1 },
      errRK2: { x: ex, y: e2 },
      errRK4: { x: ex, y: e4 },
      driftEuler: {
        value: euler.en[euler.en.length - 1],
        meta: { label: 'E(T)/E₀ Euler', precision: 2 },
      },
      driftRK4: {
        value: rk4.en[rk4.en.length - 1],
        meta: { label: 'E(T)/E₀ RK4', precision: 4 },
      },
    },
  };
}
