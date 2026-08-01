// Least-squares frequency estimation of a sinusoid with KNOWN amplitude and
// phase in additive white Gaussian noise:
//   x[i] = A·sin(2πf·tᵢ + φ) + w[i],   J(f) = Σᵢ (x[i] − A·sin(2πf·tᵢ + φ))²
// J is non-convex in f (secondary basins ≈ 1/T apart): three minimizers are
// compared — exhaustive grid search (+ parabolic refinement), normalized
// gradient descent with Armijo backtracking, and (unsafeguarded) Newton.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const FS = 100; // sampling rate (Hz)
const T = 1; // duration (s)
const N = FS * T;
const FMIN = 0.5;
const FMAX = 19.5;

/**
 * @param {{f: number, A: number, phi: number, sigma: number, f0: number,
 *          seed: number}} params — `seed` injected by the core
 * @returns {{observables: Object}}
 */
export function compute({ f, A, phi, sigma, f0, seed }) {
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

  const dJ = (fc) => {
    let s = 0;
    for (let i = 0; i < N; i++) {
      const th = 2 * Math.PI * fc * t[i] + phi;
      const r = x[i] - A * Math.sin(th);
      s += -2 * r * A * 2 * Math.PI * t[i] * Math.cos(th);
    }
    return s;
  };

  const d2J = (fc) => {
    let s = 0;
    for (let i = 0; i < N; i++) {
      const th = 2 * Math.PI * fc * t[i] + phi;
      const w = 2 * Math.PI * t[i];
      const r = x[i] - A * Math.sin(th);
      s += 2 * w * w * (A * A * Math.cos(th) ** 2 + r * A * Math.sin(th));
    }
    return s;
  };

  // --- grid search: sweep everything, then one parabolic refinement --------
  const NG = 781;
  const gf = new Float64Array(NG);
  const gj = new Float64Array(NG);
  let jmin = 0;
  for (let j = 0; j < NG; j++) {
    gf[j] = FMIN + ((FMAX - FMIN) * j) / (NG - 1);
    gj[j] = J(gf[j]);
    if (gj[j] < gj[jmin]) jmin = j;
  }
  let fGrid = gf[jmin];
  if (jmin > 0 && jmin < NG - 1) {
    const denom = gj[jmin - 1] - 2 * gj[jmin] + gj[jmin + 1];
    if (denom > 0) {
      const step = gf[1] - gf[0];
      fGrid += (0.5 * step * (gj[jmin - 1] - gj[jmin + 1])) / denom;
    }
  }

  // --- normalized gradient descent with Armijo backtracking ----------------
  const clamp = (v) => Math.min(FMAX, Math.max(FMIN, v));
  const gradPathF = [f0];
  {
    let fc = f0;
    for (let k = 0; k < 40; k++) {
      const g = dJ(fc);
      if (g === 0) break;
      const dir = -Math.sign(g);
      const J0 = J(fc);
      let alpha = 0.3; // Hz — descend by bounded steps, halved until decrease
      let fNew = clamp(fc + dir * alpha);
      let guard = 0;
      while (guard++ < 25 && J(fNew) > J0 - 1e-4 * alpha * Math.abs(g)) {
        alpha /= 2;
        fNew = clamp(fc + dir * alpha);
      }
      if (Math.abs(fNew - fc) < 1e-4) break;
      fc = fNew;
      gradPathF.push(fc);
    }
  }
  const fGrad = gradPathF[gradPathF.length - 1];

  // --- Newton (unsafeguarded on purpose: it also chases maxima) ------------
  const newtonPathF = [f0];
  {
    let fc = f0;
    for (let k = 0; k < 25; k++) {
      const h = d2J(fc);
      if (!Number.isFinite(h) || Math.abs(h) < 1e-9) break;
      const fNew = clamp(fc - dJ(fc) / h);
      newtonPathF.push(fNew);
      if (Math.abs(fNew - fc) < 1e-5) break;
      fc = fNew;
    }
  }
  const fNewton = newtonPathF[newtonPathF.length - 1];

  // --- display data --------------------------------------------------------
  const nd = 401;
  const dt = new Float64Array(nd);
  const dTrue = new Float64Array(nd);
  const dFit = new Float64Array(nd);
  for (let i = 0; i < nd; i++) {
    const ti = (T * i) / (nd - 1);
    dt[i] = ti;
    dTrue[i] = A * Math.sin(2 * Math.PI * f * ti + phi);
    dFit[i] = A * Math.sin(2 * Math.PI * fGrid * ti + phi);
  }

  const pathSeries = (arr) => ({
    x: Float64Array.from(arr),
    y: Float64Array.from(arr, (v) => J(v)),
  });

  return {
    observables: {
      noisySamples: { x: t, y: x },
      trueSignal: { x: dt, y: dTrue },
      fittedSignal: { x: dt, y: dFit },
      costCurve: { x: gf, y: gj },
      gradPath: pathSeries(gradPathF),
      newtonPath: pathSeries(newtonPathF),
      fGrid: { value: fGrid, meta: { label: 'f̂ grille', unit: 'Hz', precision: 3 } },
      fGrad: { value: fGrad, meta: { label: 'f̂ gradient', unit: 'Hz', precision: 3 } },
      fNewton: { value: fNewton, meta: { label: 'f̂ Newton', unit: 'Hz', precision: 3 } },
    },
  };
}
