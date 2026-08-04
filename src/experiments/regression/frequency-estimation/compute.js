// Least-squares frequency estimation of a sinusoid with KNOWN amplitude and
// phase in additive white Gaussian noise:
//   x[i] = A·sin(2πf·tᵢ + φ) + w[i],   J(f) = Σᵢ (x[i] − A·sin(2πf·tᵢ + φ))²
// J is non-convex in f (secondary basins ≈ 1/T apart), so the estimator is
// a plain GRID SEARCH with an adjustable step — the pedagogical knob:
//   · quantization: the argmax cannot do better than ±step/2
//   · cost: nEvals = (FMAX−FMIN)/step + 1 evaluations of J
//   · a step wider than the 1/T basin can jump OVER the global minimum
// No iterative refinement on purpose: descent methods on this landscape are
// a story for the optimization chapter (numerics/gradient-descent).
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const FS = 100; // sampling rate (Hz)
const T = 1; // duration (s)
const N = FS * T;
const FMIN = 0.5;
const FMAX = 19.5;
const NREF = 781; // dense reference curve for the J(f) view

/**
 * @param {{f: number, A: number, phi: number, sigma: number, step: number,
 *          seed: number}} params — `seed` injected by the core
 * @returns {{observables: Object}}
 */
export function compute({ f, A, phi, sigma, step, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  const t = new Float64Array(N);
  const x = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    t[i] = i / FS;
    x[i] = A * Math.sin(2 * Math.PI * f * t[i] + phi) + sigma * gauss();
  }

  const J = (fc) => {
    let s = 0;
    for (let i = 0; i < N; i++) {
      const r = x[i] - A * Math.sin(2 * Math.PI * fc * t[i] + phi);
      s += r * r;
    }
    return s;
  };

  // dense reference curve (display only — the estimator never sees it)
  const rf = new Float64Array(NREF);
  const rj = new Float64Array(NREF);
  for (let j = 0; j < NREF; j++) {
    rf[j] = FMIN + ((FMAX - FMIN) * j) / (NREF - 1);
    rj[j] = J(rf[j]);
  }

  // THE estimator: evaluate J on the user's grid, keep the argmin — nothing
  // smarter, so the step directly bounds the accuracy
  const nEvals = Math.floor((FMAX - FMIN) / step) + 1;
  const gx = new Float64Array(nEvals);
  const gy = new Float64Array(nEvals);
  let jmin = 0;
  for (let j = 0; j < nEvals; j++) {
    gx[j] = FMIN + j * step;
    gy[j] = J(gx[j]);
    if (gy[j] < gy[jmin]) jmin = j;
  }
  const fHat = gx[jmin];

  // reconstructed signal at the grid estimate
  const nd = 401;
  const dt = new Float64Array(nd);
  const dTrue = new Float64Array(nd);
  const dFit = new Float64Array(nd);
  for (let i = 0; i < nd; i++) {
    const ti = (T * i) / (nd - 1);
    dt[i] = ti;
    dTrue[i] = A * Math.sin(2 * Math.PI * f * ti + phi);
    dFit[i] = A * Math.sin(2 * Math.PI * fHat * ti + phi);
  }

  return {
    observables: {
      noisySamples: { x: t, y: x },
      trueSignal: { x: dt, y: dTrue },
      fittedSignal: { x: dt, y: dFit },
      costCurve: { x: rf, y: rj },
      gridPts: { x: gx, y: gy },
      fHat: { value: fHat, meta: { label: 'f̂ (argmin grille)', unit: 'Hz', precision: 3 } },
      errHat: {
        value: Math.abs(fHat - f),
        meta: { label: '|f̂ − f|', unit: 'Hz', precision: 3 },
      },
      nEvals: { value: nEvals, meta: { label: 'evaluations of J', precision: 0 } },
    },
  };
}
