// Affine transformation of a random variable: Y = aX + b. Exposes the base
// pdf f_X, the transformed pdf f_Y(y) = f_X((y−b)/a)/|a| on a common grid,
// the exact moments of both variables, and N transformed realizations.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { normalPdf } from '../../../core/numeric.js';

// Canonical base laws (fixed parameters — a and b do the transforming).
const LAWS = {
  gaussian: {
    range: [-4, 4],
    pdf: (x) => normalPdf(x),
    sample: (rand, gauss) => gauss(),
    mean: 0,
    variance: 1,
  },
  uniform: {
    range: [-0.25, 1.25],
    pdf: (x) => (x >= 0 && x <= 1 ? 1 : 0),
    sample: (rand) => rand(),
    mean: 0.5,
    variance: 1 / 12,
  },
  exponential: {
    range: [-0.3, 6],
    pdf: (x) => (x < 0 ? 0 : Math.exp(-x)),
    sample: (rand) => -Math.log(1 - rand()),
    mean: 1,
    variance: 1,
  },
  rayleigh: {
    range: [-0.25, 4],
    pdf: (x) => (x < 0 ? 0 : x * Math.exp(-(x * x) / 2)),
    sample: (rand) => Math.sqrt(-2 * Math.log(1 - rand())),
    mean: Math.sqrt(Math.PI / 2),
    variance: 2 - Math.PI / 2,
  },
};

/**
 * @param {{law: string, a: number, b: number, N: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ law, a, b, N, seed }) {
  const L = LAWS[law];
  const rand = mulberry32(seed);
  const gauss = gaussFrom(rand);

  // common grid covering the supports of both X and Y = aX + b
  const [xlo, xhi] = L.range;
  const y1 = a * xlo + b;
  const y2 = a * xhi + b;
  const lo = Math.min(xlo, y1, y2);
  const hi = Math.max(xhi, y1, y2);
  const pad = 0.04 * (hi - lo);
  const ng = 401;
  const gx = new Float64Array(ng);
  const fx = new Float64Array(ng);
  const fy = new Float64Array(ng);
  const absA = Math.abs(a);
  for (let i = 0; i < ng; i++) {
    const x = lo - pad + ((hi - lo + 2 * pad) * i) / (ng - 1);
    gx[i] = x;
    fx[i] = L.pdf(x);
    fy[i] = L.pdf((x - b) / a) / absA;
  }

  // transformed realizations
  const ySamples = new Float64Array(N);
  for (let i = 0; i < N; i++) ySamples[i] = a * L.sample(rand, gauss) + b;

  return {
    observables: {
      pdfX: { x: gx, y: fx },
      pdfY: { x: gx, y: fy },
      ySamples,
      meanX: { value: L.mean, meta: { label: 'E[X]', precision: 3 } },
      varX: { value: L.variance, meta: { label: 'Var(X)', precision: 3 } },
      meanY: { value: a * L.mean + b, meta: { label: 'E[Y]', precision: 3 } },
      varY: { value: a * a * L.variance, meta: { label: 'Var(Y)', precision: 3 } },
    },
  };
}
