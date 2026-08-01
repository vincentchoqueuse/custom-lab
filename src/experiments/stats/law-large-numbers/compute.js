// Law of large numbers: K trajectories of the running mean x̄ₙ of iid draws,
// recorded at log-spaced checkpoints, against the funnel μ ± 2σ/√n.
// The K trajectories are packed in ONE series with NaN separators (the line
// primitive breaks segments on non-finite values).
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32 } from '../../../core/rng.js';

// One draw + exact first two moments per law (fixed canonical parameters,
// except Bernoulli's p which is a manifest param).
const LAWS = {
  dice: {
    sample: (q, rand) => 1 + Math.floor(rand() * 6),
    mean: () => 3.5,
    variance: () => 35 / 12,
  },
  uniform: {
    sample: (q, rand) => rand(),
    mean: () => 0.5,
    variance: () => 1 / 12,
  },
  exponential: {
    sample: (q, rand) => -Math.log(1 - rand()),
    mean: () => 1,
    variance: () => 1,
  },
  bernoulli: {
    sample: (q, rand) => (rand() < q.p ? 1 : 0),
    mean: (q) => q.p,
    variance: (q) => q.p * (1 - q.p),
  },
};

/** Log-spaced integer checkpoints 1…n (≈ 260, unique, ascending). */
function logCheckpoints(n) {
  const out = [1];
  const steps = 260;
  for (let i = 1; i <= steps; i++) {
    const v = Math.round(10 ** ((Math.log10(n) * i) / steps));
    if (v > out[out.length - 1]) out.push(v);
  }
  if (out[out.length - 1] !== n) out.push(n);
  return out;
}

/**
 * @param {{law: string, n: number, K: number, p: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute(params) {
  const { law, n, K, seed } = params;
  const L = LAWS[law];
  const rand = mulberry32(seed);
  const mu = L.mean(params);
  const sd = Math.sqrt(L.variance(params));

  const cps = logCheckpoints(n);
  const nc = cps.length;

  // K running-mean trajectories, NaN-separated in a single series
  const tx = new Float64Array(K * (nc + 1));
  const ty = new Float64Array(K * (nc + 1));
  const finalMeans = new Float64Array(K);
  let worst = 0;
  let w = 0;
  for (let k = 0; k < K; k++) {
    let sum = 0;
    let i = 0;
    for (let c = 0; c < nc; c++) {
      while (i < cps[c]) {
        sum += L.sample(params, rand);
        i++;
      }
      tx[w] = cps[c];
      ty[w] = sum / i;
      w++;
    }
    finalMeans[k] = sum / n;
    worst = Math.max(worst, Math.abs(finalMeans[k] - mu));
    tx[w] = NaN; // segment separator
    ty[w] = NaN;
    w++;
  }

  // the 2σ/√n funnel on the same checkpoints
  const fx = new Float64Array(nc);
  const flo = new Float64Array(nc);
  const fhi = new Float64Array(nc);
  for (let c = 0; c < nc; c++) {
    const half = (2 * sd) / Math.sqrt(cps[c]);
    fx[c] = cps[c];
    flo[c] = mu - half;
    fhi[c] = mu + half;
  }

  return {
    observables: {
      trajectories: { x: tx, y: ty },
      funnel: { x: fx, lo: flo, hi: fhi },
      finalMeans,
      meanTh: { value: mu, meta: { label: 'μ', precision: 3 } },
      worstErr: { value: worst, meta: { label: 'max |x̄ₙ−μ|', precision: 4 } },
      sdAtHorizon: { value: sd / Math.sqrt(n), meta: { label: 'σ/√n', precision: 4 } },
    },
  };
}
