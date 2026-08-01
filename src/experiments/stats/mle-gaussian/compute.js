// Maximum-likelihood estimation on a Gaussian sample: draw N realizations of
// N(μ, σ²), estimate μ̂ (and σ̂ in full-MLE mode), expose true vs estimated
// pdfs and the log-likelihood profile in μ.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { normalPdf, mean } from '../../../core/numeric.js';

/**
 * @param {{mu: number, sigma: number, N: number, model: 'mean'|'both',
 *          seed: number}} params — `seed` injected by the core
 * @returns {{observables: Object}}
 */
export function compute({ mu, sigma, N, model, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  const samples = new Float64Array(N);
  for (let i = 0; i < N; i++) samples[i] = mu + sigma * gauss();
  const muHat = mean(samples);

  // MLE variance: division by N (biased — a pedagogical point, see scenes)
  let ss = 0;
  for (let i = 0; i < N; i++) ss += (samples[i] - muHat) ** 2;
  const estimatesSigma = model === 'both';
  const sigmaHat = estimatesSigma ? Math.sqrt(ss / N) : sigma;

  // true and estimated pdfs on a common grid
  const sMax = Math.max(sigma, sigmaHat);
  const lo = Math.min(mu, muHat) - 4 * sMax;
  const hi = Math.max(mu, muHat) + 4 * sMax;
  const ng = 161;
  const gx = new Float64Array(ng);
  const trueY = new Float64Array(ng);
  const estY = new Float64Array(ng);
  for (let i = 0; i < ng; i++) {
    const x = lo + ((hi - lo) * i) / (ng - 1);
    gx[i] = x;
    trueY[i] = normalPdf(x, mu, sigma);
    estY[i] = normalPdf(x, muHat, sigmaHat);
  }

  // log-likelihood profile in μ, σ held at its estimate (or known value):
  // ℓ(m) = −N/2·ln(2πσ̂²) − [Σ(xᵢ−μ̂)² + N(μ̂−m)²] / (2σ̂²)
  const sLik = sigmaHat;
  const se = sLik / Math.sqrt(N);
  const gl = Math.min(mu, muHat) - 4 * se;
  const gh = Math.max(mu, muHat) + 4 * se;
  const nm = 161;
  const lx = new Float64Array(nm);
  const ly = new Float64Array(nm);
  const cst = (-N / 2) * Math.log(2 * Math.PI * sLik * sLik);
  for (let i = 0; i < nm; i++) {
    const m = gl + ((gh - gl) * i) / (nm - 1);
    lx[i] = m;
    ly[i] = cst - (ss + N * (muHat - m) ** 2) / (2 * sLik * sLik);
  }

  return {
    observables: {
      samples,
      samplesRug: { x: samples, y: new Float64Array(N) }, // dots on the x axis
      muHat: { value: muHat, meta: { label: 'μ̂', precision: 3 } },
      sigmaHat: estimatesSigma
        ? { value: sigmaHat, meta: { label: 'σ̂', precision: 3 } }
        : { value: sigmaHat, meta: {} }, // known σ: not an estimate, no statline
      truePdf: { x: gx, y: trueY },
      estimatedPdf: { x: gx, y: estY },
      logLik: { x: lx, y: ly },
    },
  };
}
