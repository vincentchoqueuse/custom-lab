// Simple linear regression, y = a·x + b + noise, by ordinary least squares.
// The closed form is the whole point, so nothing here is iterated:
//   â = Sxy / Sxx      b̂ = ȳ − â·x̄      with Sxx = Σ(xᵢ − x̄)², Sxy = Σ(xᵢ − x̄)(yᵢ − ȳ)
// and the two properties that CHARACTERISE the solution, both checked to
// machine precision: the residuals sum to zero and are orthogonal to x —
// least squares is a projection, and that is what the residual segments in
// the first view are drawing.
//
// Var(â) = σ²/Sxx is the reason the x spread is a parameter: the estimate is
// not improved only by more points but by points placed FURTHER APART. The
// sampling view measures that over M repeated experiments and confronts it
// with the closed form.
//
// One outlier slider, because least squares has no defence against it: a
// single point, pulled far off, drags the whole line — visible, then
// quantified by R².
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { mean, variance, normalPdf } from '../../../core/numeric.js';

const NREP = 400; // repeated experiments for the sampling distribution
const NPDF = 160;

/** OLS on (x, y): returns the slope, the intercept and the residual sums. */
export function fit(x, y) {
  const xb = mean(x);
  const yb = mean(y);
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - xb;
    const dy = y[i] - yb;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const a = sxy / sxx;
  return { a, b: yb - a * xb, sxx, sxy, syy, xb, yb };
}

/** The N observations of one experiment, at a given seed. */
function sample(rng, { a, b, sigma, N, spread, outlier }) {
  const gauss = gaussFrom(rng);
  const x = new Float64Array(N);
  const y = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    x[i] = -spread + (2 * spread * i) / (N - 1);
    y[i] = a * x[i] + b + sigma * gauss();
  }
  // the outlier lands on the last point, so moving the slider moves ONE dot
  y[N - 1] += outlier;
  return { x, y };
}

/**
 * @param {{a: number, b: number, sigma: number, N: number, spread: number,
 *          outlier: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute(params) {
  const { a, b, sigma, N, spread, outlier, seed } = params;
  const { x, y } = sample(mulberry32(seed), params);
  const f = fit(x, y);

  /* ---------- the cloud, the fitted line, the residuals ------------------- */
  const lx = Float64Array.from([-spread, spread]);
  const ly = Float64Array.from([f.a * -spread + f.b, f.a * spread + f.b]);
  const ty = Float64Array.from([a * -spread + b, a * spread + b]);

  // residuals as ONE series broken by NaN: the generic Line splits its path
  // there, so the vertical segments need no custom view
  const rx = new Float64Array(3 * N);
  const ry = new Float64Array(3 * N);
  const resid = new Float64Array(N);
  let sse = 0;
  for (let i = 0; i < N; i++) {
    const yhat = f.a * x[i] + f.b;
    resid[i] = y[i] - yhat;
    sse += resid[i] * resid[i];
    rx[3 * i] = x[i];
    ry[3 * i] = y[i];
    rx[3 * i + 1] = x[i];
    ry[3 * i + 1] = yhat;
    rx[3 * i + 2] = NaN;
    ry[3 * i + 2] = NaN;
  }
  const r2 = 1 - sse / f.syy;

  /* ---------- the sampling distribution of â ------------------------------ */
  // M independent experiments at the same design: the spread of â is what the
  // Cramér-Rao-style formula σ²/Sxx predicts, and it is measured here
  const slopes = new Float64Array(NREP);
  for (let r = 0; r < NREP; r++) {
    const s = sample(mulberry32(seed + 1000 * (r + 1)), params);
    slopes[r] = fit(s.x, s.y).a;
  }
  const seA = Math.sqrt(sigma * sigma / f.sxx); // theoretical standard error
  const px = new Float64Array(NPDF);
  const py = new Float64Array(NPDF);
  for (let i = 0; i < NPDF; i++) {
    px[i] = a - 4 * seA + (8 * seA * i) / (NPDF - 1);
    py[i] = normalPdf(px[i], a, seA);
  }

  return {
    observables: {
      points: { x, y },
      fitted: { x: lx, y: ly },
      truth: { x: lx, y: ty },
      residualSegments: { x: rx, y: ry },
      residuals: { x, y: resid },
      slopes,
      slopePdf: { x: px, y: py },
      aHat: { value: f.a, meta: { label: 'slope â', precision: 3 } },
      bHat: { value: f.b, meta: { label: 'intercept b̂', precision: 3 } },
      r2: { value: r2, meta: { label: 'R²', precision: 4 } },
      seTh: { value: seA, meta: { label: 'standard deviation of â: σ/√Sxx', precision: 4 } },
      seEmp: {
        value: Math.sqrt(variance(slopes)),
        meta: { label: 'measured standard deviation of â', precision: 4 },
      },
      sse: { value: sse, meta: { label: 'sum of squared residuals', precision: 3 } },
      sxx: { value: f.sxx, meta: { label: 'Sxx = Σ(xᵢ − x̄)²', precision: 1 } },
    },
  };
}
