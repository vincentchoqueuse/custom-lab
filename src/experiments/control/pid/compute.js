// PID control of the canonical plant G(s) = 1/(s² + 2s + 1) (the second
// order with m = 1, ω₀ = 1, unit static gain): setpoint step at t = 0,
// LOAD DISTURBANCE step d = −0.5 at the plant input at t = 10 s — the
// integrator's raison d'être. Discrete loop at h = 5 ms, plant advanced by
// RK4 under zero-order hold; derivative acts on the FILTERED measurement
// (τf = 50 ms), the standard cure for the derivative kick; optional
// measurement noise (seeded) to show what Kd does to the command.
//   P alone: steady-state error 1/(1+Kp) — measured against theory.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { rk4Step, toDb } from '../../../core/numeric.js';
import { bodeSweep, bodeObservables } from '../_lib/bode.js';

const H = 0.005; // loop period (s)
const T_END = 20;
const T_DIST = 10; // load-disturbance instant
const D_LOAD = -0.5;
const TAU_F = 0.05; // derivative filter time constant
const KEEP = 4; // display decimation (800 points)

/** Plant dynamics: x = [y, y'], input u (+ load d): y'' = u + d − 2y' − y. */
const plantDeriv = (u) => (x) => [x[1], u - 2 * x[1] - x[0]];

/**
 * @param {{Kp: number, Ki: number, Kd: number, sigma: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ Kp, Ki, Kd, sigma, seed }) {
  const gauss = gaussFrom(mulberry32(seed));
  const n = Math.round(T_END / H);
  const nk = Math.floor(n / KEEP) + 1;
  const t = new Float64Array(nk);
  const ys = new Float64Array(nk);
  const us = new Float64Array(nk);

  let x = [0, 0];
  let integ = 0;
  let yf = 0; // filtered measurement (derivative source)
  let overshootMax = 0;
  let essAcc = 0;
  let essCnt = 0;
  let rejAcc = 0;
  let rejCnt = 0;
  let uVarAcc = 0;
  let uMean = 0;
  let uCnt = 0;
  const CLAMP = 1e6;

  let w = 0;
  for (let i = 0; i <= n; i++) {
    const ti = i * H;
    const yMeas = x[0] + sigma * gauss();

    // filtered derivative of the measurement
    const yfNext = yf + (H / TAU_F) * (yMeas - yf);
    const dFilt = (yfNext - yf) / H;
    yf = yfNext;

    const e = 1 - yMeas;
    integ += Ki * e * H;
    const u = Kp * e + integ - Kd * dFilt;

    if (i % KEEP === 0) {
      t[w] = ti;
      ys[w] = x[0];
      us[w] = u;
      w++;
    }
    if (ti < T_DIST && x[0] > overshootMax) overshootMax = x[0];
    if (ti > T_DIST - 1 && ti < T_DIST) {
      essAcc += 1 - x[0];
      essCnt++;
    }
    if (ti > T_END - 2) {
      rejAcc += Math.abs(1 - x[0]);
      rejCnt++;
    }
    // command activity in steady state only (transients would drown the noise)
    if (ti > 15) {
      uVarAcc += u * u;
      uMean += u;
      uCnt++;
    }

    if (i === n) break;
    const d = ti >= T_DIST ? D_LOAD : 0;
    x = rk4Step(plantDeriv(u + d), x, ti, H);
    if (!Number.isFinite(x[0]) || Math.abs(x[0]) > CLAMP) x = [CLAMP, 0];
  }

  uMean /= uCnt;
  const uStd = Math.sqrt(Math.max(uVarAcc / uCnt - uMean * uMean, 0));

  /* ---------- the open loop L = C·G, where the margins live --------------- */
  // Same three gains, same plant, seen in frequency instead of in time:
  //   C(jω) = Kp + Ki/(jω) − Kd·jω/(1 + jωτ_f)   (derivative on the FILTERED
  //           measurement, exactly as the loop above implements it — so this
  //           is the transfer function of the code, not of a textbook PID)
  //   G(jω) = 1/(1 − ω² + 2jω)
  // The integrator makes |L| → ∞ at ω → 0 and pins the phase at −90° there,
  // which is the frequency face of "Ki kills the static error". The phase
  // margin read here is the same stability the step response shows in time —
  // two readings of one loop, which is the point of putting them side by side.
  const bodeL = bodeSweep(
    (w) => {
      // C(jω): the integral term is −jKi/ω, the filtered derivative
      // Kd·jω/(1+jωτ_f) = Kd·ω²τ_f/(1+ω²τ_f²) + j·Kd·ω/(1+ω²τ_f²)
      const df = 1 + (w * TAU_F) ** 2;
      const cr = Kp + (Kd * w * w * TAU_F) / df;
      const ci = -Ki / w + (Kd * w) / df;
      // G(jω) = 1/((1−ω²) + 2jω)
      const gr = 1 - w * w;
      const gi = 2 * w;
      const gd = gr * gr + gi * gi;
      // C·G
      const pr = (cr * gr + ci * gi) / gd;
      const pi = (ci * gr - cr * gi) / gd;
      return [pr, pi];
    },
    { center: 1, decades: 2.5 } // ω₀ = 1 rad/s: the plant's own pulsation
  );

  return {
    observables: {
      output: { x: t, y: ys },
      command: { x: t, y: us },
      ...bodeObservables(bodeL),
      zeroDb: toDb(1), // hline: 0 dB, where the phase margin is read
      overshoot: {
        value: Math.max(0, (overshootMax - 1) * 100),
        meta: { label: 'dépassement', unit: '%', precision: 1 },
      },
      ess: {
        value: essAcc / essCnt,
        meta: { label: 'erreur statique (avant perturbation)', precision: 4 },
      },
      rejection: {
        value: rejAcc / rejCnt,
        meta: { label: '|erreur| finale', precision: 4 },
      },
      uStd: { value: uStd, meta: { label: 'σ(u) régime établi', precision: 3 } },
    },
  };
}
