// Central limit theorem: draw M means of n iid realizations of the selected
// law and compare their histogram with the Gaussian of the SAME mean and the
// CORRECT variance, N(μ, σ²/n).
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

/**
 * @param {{law: string, n: number, M: number, p: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute(params) {
  const { law, n, M, seed } = params;
  const L = LAWS[law];
  const rand = mulberry32(seed);

  const means = new Float64Array(M);
  let acc = 0;
  for (let m = 0; m < M; m++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += L.sample(params, rand);
    means[m] = s / n;
    acc += means[m];
  }
  const empMean = acc / M;
  let ss = 0;
  for (let m = 0; m < M; m++) ss += (means[m] - empMean) ** 2;
  const empSd = Math.sqrt(ss / (M - 1));

  // the CLT Gaussian: same mean, variance σ²/n
  const mu = L.mean(params);
  const sd = Math.sqrt(L.variance(params) / n);
  const ng = 201;
  const gx = new Float64Array(ng);
  const gy = new Float64Array(ng);
  for (let i = 0; i < ng; i++) {
    const x = mu - 4.2 * sd + (8.4 * sd * i) / (ng - 1);
    gx[i] = x;
    gy[i] = Math.exp(-((x - mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
  }

  // histogram of the means, binned here so edges can align with the discrete
  // value grid (means of dice/bernoulli live on multiples of 1/n): unaligned
  // bins would alias into a misleading sawtooth
  const lo = gx[0];
  const hi = gx[ng - 1];
  let width = (hi - lo) / 40;
  let start = lo;
  if (law === 'dice' || law === 'bernoulli') {
    const spacing = 1 / n;
    width = Math.max(spacing, Math.round(width / spacing) * spacing);
    start = (Math.floor((lo + spacing / 2) / width) - 0.5) * width;
  }
  const nb = Math.ceil((hi - start) / width);
  const hx = new Float64Array(nb);
  const hy = new Float64Array(nb);
  for (let j = 0; j < nb; j++) hx[j] = start + (j + 0.5) * width;
  for (let m = 0; m < M; m++) {
    const j = Math.min(nb - 1, Math.max(0, Math.floor((means[m] - start) / width)));
    hy[j] += 1 / (M * width);
  }

  return {
    observables: {
      means,
      meansPdf: { x: hx, y: hy },
      gaussPdf: { x: gx, y: gy },
      empMean: { value: empMean, meta: { label: 'x̄', precision: 3 } },
      thMean: { value: mu, meta: { label: 'μ', precision: 3 } },
      empSd: { value: empSd, meta: { label: 's(x̄ₙ)', precision: 4 } },
      thSd: { value: sd, meta: { label: 'σ/√n', precision: 4 } },
    },
  };
}
