// Neyman-Pearson detection of a known constant signal in white Gaussian
// noise (σ = 1). The matched-filter statistic T = Σxᵢ/√N is exactly
// Gaussian: T|H₀ ~ N(0, 1), T|H₁ ~ N(d, 1) with deflection d = √(N·SNR).
// NP test at level P_FA: threshold γ = Φ⁻¹(1−P_FA), giving P_D = Q(γ−d).
// Monte Carlo runs the FULL N-sample simulation (not the shortcut through
// the statistic's known law) so the empirical points genuinely test theory.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { normalPdf, normalCdf, normalQuantile } from '../../../core/numeric.js';

/**
 * @param {{snr: number, pfa: number, N: number, M: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ snr, pfa, N, M, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  const d = Math.sqrt(N * snr);
  const gamma = normalQuantile(1 - pfa);
  const pd = 1 - normalCdf(gamma - d);

  // densities of T on a common grid
  const lo = -4.5;
  const hi = d + 4.5;
  const ng = 301;
  const gt = new Float64Array(ng);
  const f0 = new Float64Array(ng);
  const f1 = new Float64Array(ng);
  for (let i = 0; i < ng; i++) {
    const t = lo + ((hi - lo) * i) / (ng - 1);
    gt[i] = t;
    f0[i] = normalPdf(t);
    f1[i] = normalPdf(t, d, 1);
  }

  // decision areas beyond γ (bands from 0 up to each density)
  const zone = (mean) => {
    const zx = [gamma];
    const zhi = [normalPdf(gamma, mean, 1)];
    for (let i = 0; i < ng; i++) {
      if (gt[i] > gamma) {
        zx.push(gt[i]);
        zhi.push(mean === 0 ? f0[i] : f1[i]);
      }
    }
    return {
      x: Float64Array.from(zx),
      lo: new Float64Array(zx.length),
      hi: Float64Array.from(zhi),
    };
  };

  // Monte Carlo: full N-sample simulation under both hypotheses
  const A = Math.sqrt(snr); // signal amplitude for σ = 1
  const sqrtN = Math.sqrt(N);
  let fa = 0;
  let det = 0;
  for (let m = 0; m < M; m++) {
    let t0 = 0;
    let t1 = 0;
    for (let i = 0; i < N; i++) {
      t0 += gauss();
      t1 += A + gauss();
    }
    if (t0 / sqrtN > gamma) fa++;
    if (t1 / sqrtN > gamma) det++;
  }
  const pfaEmp = fa / M;
  const pdEmp = det / M;

  // theoretical ROC over a log-spaced P_FA grid
  const nr = 121;
  const rx = new Float64Array(nr);
  const ry = new Float64Array(nr);
  for (let i = 0; i < nr; i++) {
    const p = 10 ** (-4 + (4 * i) / (nr - 1));
    rx[i] = p;
    ry[i] = 1 - normalCdf(normalQuantile(1 - p) - d);
  }

  // P_D vs SNR (dB) at the current P_FA and N
  const ns = 161;
  const sx = new Float64Array(ns);
  const sy = new Float64Array(ns);
  for (let i = 0; i < ns; i++) {
    const db = -20 + (40 * i) / (ns - 1);
    sx[i] = db;
    sy[i] = 1 - normalCdf(gamma - Math.sqrt(N * 10 ** (db / 10)));
  }

  return {
    observables: {
      pdfH0: { x: gt, y: f0 },
      pdfH1: { x: gt, y: f1 },
      pfaZone: zone(0),
      pdZone: zone(d),
      rocCurve: { x: rx, y: ry },
      chanceLine: { x: rx, y: rx },
      opTheory: { x: Float64Array.from([pfa]), y: Float64Array.from([pd]) },
      opEmp: { x: Float64Array.from([pfaEmp]), y: Float64Array.from([pdEmp]) },
      pdVsSnr: { x: sx, y: sy },
      opSnrEmp: {
        x: Float64Array.from([10 * Math.log10(snr)]),
        y: Float64Array.from([pdEmp]),
      },
      gamma: { value: gamma, meta: { label: 'γ', precision: 2 } },
      pdTh: { value: pd, meta: { label: 'P_D', precision: 3 } },
      pdEmpS: { value: pdEmp, meta: { label: 'P̂_D', precision: 3 } },
      pfaEmpS: { value: pfaEmp, meta: { label: 'P̂_FA', precision: 4 } },
      deflection: { value: d, meta: { label: 'd', precision: 2 } },
    },
  };
}
