// The first-order system, with an optional zero:
//        K (1 + τ_z·s)
//   H(s) = ────────────
//         (1 + τ·s)
// Everything below is a closed form, none of it integrated numerically:
//   indicielle    y(t) = K[1 − (1 − τ_z/τ)·e^{−t/τ}]
//   impulsion     h(t) = K·(τ_z/τ)·δ(t) + (K/τ)(1 − τ_z/τ)·e^{−t/τ}
//   pôle          s = −1/τ          zéro  s = −1/τ_z  (aucun si τ_z = 0)
//   fréquentiel   H(jω) = K(1 + jωτ_z)/(1 + jωτ)
//
// τ_z is a single slider that produces the three textbook behaviours:
//   τ_z = 0    no zero, the pure exponential rise
//   0 < τ_z    the response JUMPS at t = 0 (the zero feeds through), and
//              overshoots the final value when τ_z > τ
//   τ_z < 0    zero in the right half-plane: NON MINIMUM PHASE, the output
//              starts by going the WRONG WAY before coming back
// One exact identity survives all three, and it is the reason the tangent is
// drawn: the initial tangent always crosses the final value at t = τ exactly.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { bodeSweep, bodeObservables } from '../_lib/bode.js';
import { toDb } from '../../../core/numeric.js';

const NG = 800; // time samples
const NW = 121; // frequency grid: ±2.5 decades around 1/τ
const EPS = 1e-9;

/** y(t) — step response, closed form. */
const stepValue = (K, tau, tz, t) => K * (1 - (1 - tz / tau) * Math.exp(-t / tau));

/** Continuous part of h(t) — the Dirac of weight K·τ_z/τ is reported apart. */
const impulseValue = (K, tau, tz, t) => ((K * (1 - tz / tau)) / tau) * Math.exp(-t / tau);

/**
 * @param {{K: number, tau: number, tz: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ K, tau, tz }) {
  const T = 6 * tau; // six time constants: the residue is below 0.25 %

  /* ---------- time: step and impulse -------------------------------------- */
  const t = new Float64Array(NG);
  const y = new Float64Array(NG);
  const h = new Float64Array(NG);
  const tangent = new Float64Array(NG);
  const y0 = stepValue(K, tau, tz, 0);
  const slope = (K * (1 - tz / tau)) / tau; // y'(0)
  let peak = y0;
  let trough = y0;
  for (let i = 0; i < NG; i++) {
    t[i] = (i * T) / (NG - 1);
    y[i] = stepValue(K, tau, tz, t[i]);
    h[i] = impulseValue(K, tau, tz, t[i]);
    // the initial tangent, drawn only while it stays in frame
    const g = y0 + slope * t[i];
    tangent[i] = t[i] <= 1.25 * tau ? g : NaN;
    peak = Math.max(peak, y[i]);
    trough = Math.min(trough, y[i]);
  }

  // 5 % settling time: last exit from the band around the final value K
  let t5 = 0;
  for (let i = NG - 1; i >= 0; i--) {
    if (Math.abs(y[i] - K) > 0.05 * Math.abs(K)) {
      t5 = i + 1 < NG ? t[i + 1] : T;
      break;
    }
  }

  /* ---------- poles and zeros --------------------------------------------- */
  const px = Float64Array.from([-1 / tau]);
  const py = Float64Array.from([0]);
  const hasZero = Math.abs(tz) > EPS;
  const zx = hasZero ? Float64Array.from([-1 / tz]) : new Float64Array(0);
  const zy = hasZero ? Float64Array.from([0]) : new Float64Array(0);

  /* ---------- frequency: the shared Bode sweep ----------------------------- */
  // H(jω) = K(1 + jωτ_z)/(1 + jωτ), evaluated by _lib/bode.js — the same
  // sweep, the same dB and the same unwrapped phase as every other system in
  // the subject.
  const wc = 1 / tau;
  const bode = bodeSweep((w) => {
    const nr = K;
    const ni = K * w * tz;
    const dr = 1;
    const di = w * tau;
    const d = dr * dr + di * di;
    return [(nr * dr + ni * di) / d, (ni * dr - nr * di) / d];
  }, { center: wc, decades: 2.5, n: NW });

  return {
    observables: {
      stepResponse: { x: t, y },
      tangent: { x: t, y: tangent },
      impulseResponse: { x: t, y: h },
      poles: { x: px, y: py },
      zeros: { x: zx, y: zy },
      ...bodeObservables(bode),
      wc, // vline: the cut-off 1/τ
      // −3 dB below the static gain: an hline in the SAME dB unit as the plot
      gain3dB: toDb((K * Math.hypot(1, tz / tau)) / Math.SQRT2),
      initial: { value: y0, meta: { label: 'valeur initiale y(0⁺)', precision: 3 } },
      t5: { value: t5, meta: { label: 'temps de réponse à 5 %', unit: 's', precision: 3 } },
      undershoot: {
        value: trough < -EPS ? (100 * trough) / K : 0,
        meta: { label: 'dépassement inverse', unit: '%', precision: 1 },
      },
      dirac: {
        value: (K * tz) / tau,
        meta: { label: 'poids du Dirac K·τ_z/τ', precision: 3 },
      },
      fc: {
        value: wc / (2 * Math.PI),
        meta: { label: 'fréquence de coupure', unit: 'Hz', precision: 3 },
      },
    },
  };
}

// Exported for check.js: the harness confronts the closed forms with each
// other (h = dy/dt, and the frequency response with the Laplace transform of
// the impulse response) instead of restating them.
export { stepValue, impulseValue };
