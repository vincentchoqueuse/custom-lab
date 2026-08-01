// Catalog of classic probability laws: draw N realizations of the selected
// law, expose theoretical pdf/pmf and CDF alongside their empirical
// counterparts (binned density for continuous laws, frequencies on the
// integer support for discrete ones, ECDF staircase for both).
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { normalPdf, normalCdf, mean, variance } from '../../../core/numeric.js';

/* ---------- the law catalog ----------------------------------------------- */
// Each law: continuous → {range, pdf, cdf}; discrete → {kmax, pmf}.
// All laws: {discrete, sample(q, rand, gauss), mean(q), variance(q)}.

const LAWS = {
  uniform: {
    discrete: false,
    range: (q) => {
      const s = q.b - q.a;
      return [q.a - 0.15 * s, q.b + 0.15 * s];
    },
    sample: (q, rand) => q.a + (q.b - q.a) * rand(),
    pdf: (q, x) => (x >= q.a && x <= q.b ? 1 / (q.b - q.a) : 0),
    cdf: (q, x) => (x < q.a ? 0 : x > q.b ? 1 : (x - q.a) / (q.b - q.a)),
    mean: (q) => (q.a + q.b) / 2,
    variance: (q) => (q.b - q.a) ** 2 / 12,
  },
  gaussian: {
    discrete: false,
    range: (q) => [q.mu - 4 * q.sigma, q.mu + 4 * q.sigma],
    sample: (q, rand, gauss) => q.mu + q.sigma * gauss(),
    pdf: (q, x) => normalPdf(x, q.mu, q.sigma),
    cdf: (q, x) => normalCdf(x, q.mu, q.sigma),
    mean: (q) => q.mu,
    variance: (q) => q.sigma ** 2,
  },
  exponential: {
    discrete: false,
    range: (q) => [-0.3 / q.lambda, 6 / q.lambda],
    sample: (q, rand) => -Math.log(1 - rand()) / q.lambda,
    pdf: (q, x) => (x < 0 ? 0 : q.lambda * Math.exp(-q.lambda * x)),
    cdf: (q, x) => (x < 0 ? 0 : 1 - Math.exp(-q.lambda * x)),
    mean: (q) => 1 / q.lambda,
    variance: (q) => 1 / q.lambda ** 2,
  },
  rayleigh: {
    discrete: false,
    range: (q) => [-0.25 * q.sigma, 5 * q.sigma],
    sample: (q, rand) => q.sigma * Math.sqrt(-2 * Math.log(1 - rand())),
    pdf: (q, x) =>
      x < 0 ? 0 : (x / q.sigma ** 2) * Math.exp(-(x ** 2) / (2 * q.sigma ** 2)),
    cdf: (q, x) => (x < 0 ? 0 : 1 - Math.exp(-(x ** 2) / (2 * q.sigma ** 2))),
    mean: (q) => q.sigma * Math.sqrt(Math.PI / 2),
    variance: (q) => (2 - Math.PI / 2) * q.sigma ** 2,
  },
  bernoulli: {
    discrete: true,
    kmax: () => 1,
    sample: (q, rand) => (rand() < q.p ? 1 : 0),
    pmf: (q, k) => (k === 1 ? q.p : k === 0 ? 1 - q.p : 0),
    mean: (q) => q.p,
    variance: (q) => q.p * (1 - q.p),
  },
  binomial: {
    discrete: true,
    kmax: (q) => q.n,
    sample: (q, rand) => {
      let s = 0;
      for (let i = 0; i < q.n; i++) if (rand() < q.p) s++;
      return s;
    },
    // iterative recurrence: P(k+1) = P(k)·(n−k)/(k+1)·p/(1−p)
    pmfTable: (q) => {
      const out = new Float64Array(q.n + 1);
      out[0] = (1 - q.p) ** q.n;
      for (let k = 0; k < q.n; k++) out[k + 1] = (out[k] * (q.n - k) * q.p) / ((k + 1) * (1 - q.p));
      return out;
    },
    mean: (q) => q.n * q.p,
    variance: (q) => q.n * q.p * (1 - q.p),
  },
  poisson: {
    discrete: true,
    kmax: (q) => Math.ceil(q.lambda + 6 * Math.sqrt(q.lambda) + 1),
    // Knuth: multiply uniforms until the product drops below e^{−λ}
    sample: (q, rand) => {
      const limit = Math.exp(-q.lambda);
      let k = 0;
      let prod = rand();
      while (prod > limit) {
        k++;
        prod *= rand();
      }
      return k;
    },
    pmfTable: (q) => {
      const kmax = LAWS.poisson.kmax(q);
      const out = new Float64Array(kmax + 1);
      out[0] = Math.exp(-q.lambda);
      for (let k = 0; k < kmax; k++) out[k + 1] = (out[k] * q.lambda) / (k + 1);
      return out;
    },
    mean: (q) => q.lambda,
    variance: (q) => q.lambda,
  },
};

/** ECDF staircase from samples (decimated above ~1200 steps for rendering). */
function ecdfStaircase(samples, lo, hi) {
  const N = samples.length;
  const sorted = Float64Array.from(samples).sort();
  const stride = Math.max(1, Math.ceil(N / 1200));
  const xs = [lo];
  const ys = [0];
  for (let i = 0; i < N; i += stride) {
    xs.push(sorted[i], sorted[i]);
    ys.push(i / N, Math.min(i + stride, N) / N);
  }
  xs.push(hi);
  ys.push(1);
  return { x: Float64Array.from(xs), y: Float64Array.from(ys) };
}

/**
 * @param {{law: string, N: number, a: number, b: number, mu: number,
 *          sigma: number, lambda: number, p: number, n: number,
 *          seed: number}} params — `seed` injected by the core
 * @returns {{observables: Object}}
 */
export function compute(params) {
  const { law, seed } = params;
  const N = Math.round(params.N);
  const L = LAWS[law];
  const rand = mulberry32(seed);
  const gauss = gaussFrom(rand);

  const samples = new Float64Array(N);
  for (let i = 0; i < N; i++) samples[i] = L.sample(params, rand, gauss);
  const xbar = mean(samples);
  const s2 = variance(samples, { mean: xbar });

  let theoreticalPdf;
  let empiricalPdf;
  let theoreticalCdf;
  let binWidth = 0;
  let lo;
  let hi;

  if (L.discrete) {
    const kmax = L.kmax(params);
    lo = -0.6;
    hi = kmax + 0.6;
    const ks = new Float64Array(kmax + 1);
    const pmf = L.pmfTable ? L.pmfTable(params) : new Float64Array(kmax + 1);
    if (!L.pmfTable) for (let k = 0; k <= kmax; k++) pmf[k] = L.pmf(params, k);
    const freq = new Float64Array(kmax + 1);
    for (let i = 0; i < N; i++) {
      const k = Math.min(kmax, Math.max(0, Math.round(samples[i])));
      freq[k] += 1 / N;
    }
    for (let k = 0; k <= kmax; k++) ks[k] = k;
    theoreticalPdf = { x: ks, y: pmf };
    empiricalPdf = { x: ks, y: freq };
    // theoretical CDF: staircase with doubled points at each support value
    const cx = [lo];
    const cy = [0];
    let acc = 0;
    for (let k = 0; k <= kmax; k++) {
      cx.push(k, k);
      cy.push(acc, (acc += pmf[k]));
    }
    cx.push(hi);
    cy.push(acc);
    theoreticalCdf = { x: Float64Array.from(cx), y: Float64Array.from(cy) };
  } else {
    [lo, hi] = L.range(params);
    const ng = 301;
    const gx = new Float64Array(ng);
    const py = new Float64Array(ng);
    const cy = new Float64Array(ng);
    for (let i = 0; i < ng; i++) {
      const x = lo + ((hi - lo) * i) / (ng - 1);
      gx[i] = x;
      py[i] = L.pdf(params, x);
      cy[i] = L.cdf(params, x);
    }
    theoreticalPdf = { x: gx, y: py };
    theoreticalCdf = { x: gx, y: cy };
    // histogram density estimator on the fixed theory range (stable bins)
    const nb = Math.min(60, Math.max(8, Math.round(1.4 * Math.sqrt(N))));
    binWidth = (hi - lo) / nb;
    const centers = new Float64Array(nb);
    const density = new Float64Array(nb);
    for (let j = 0; j < nb; j++) centers[j] = lo + (j + 0.5) * binWidth;
    for (let i = 0; i < N; i++) {
      const j = Math.min(nb - 1, Math.max(0, Math.floor((samples[i] - lo) / binWidth)));
      density[j] += 1 / (N * binWidth);
    }
    empiricalPdf = { x: centers, y: density };
  }

  return {
    observables: {
      samples,
      discrete: { value: L.discrete ? 1 : 0 },
      binWidth: { value: binWidth },
      theoreticalPdf,
      empiricalPdf,
      theoreticalCdf,
      empiricalCdf: ecdfStaircase(samples, lo, hi),
      xbar: { value: xbar, meta: { label: 'x̄', precision: 3 } },
      meanTh: { value: L.mean(params), meta: { label: 'E[X]', precision: 3 } },
      s2: { value: s2, meta: { label: 's²', precision: 3 } },
      varTh: { value: L.variance(params), meta: { label: 'Var(X)', precision: 3 } },
    },
  };
}
