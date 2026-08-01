// Confidence intervals: M intervals over N Gaussian draws, Student or
// Gaussian CI depending on `known`. PURE, stateless, seeded — runs in a
// worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';

/* ---------- quantile machinery (experiment-owned science) ----------------- */

/**
 * Inverse standard normal CDF (probit) — Acklam's rational approximation,
 * |ε| < 1.15e-9: plenty for CI quantiles.
 */
function probit(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pl) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Lanczos log-gamma. */
function logGamma(x) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 1.208650973866179e-3, -5.395239384953e-6];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += g[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Continued fraction for the regularized incomplete beta (Lentz). */
function betacf(a, b, x) {
  const MAXIT = 300;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
function ibeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Student-t CDF. */
function tCdf(t, nu) {
  const p = 0.5 * ibeta(nu / 2, 0.5, nu / (nu + t * t));
  return t >= 0 ? 1 - p : p;
}

/**
 * Student-t upper quantile by bisection on the exact CDF — accurate down to
 * ν = 1 (N = 2), where series expansions collapse. A wrong quantile projected
 * in a lecture hall is unacceptable.
 */
function tInv(p, nu) {
  let hi = 2;
  while (tCdf(hi, nu) < p && hi < 1e8) hi *= 2;
  let lo = 0;
  for (let i = 0; i < 100; i++) {
    const mid = 0.5 * (lo + hi);
    if (tCdf(mid, nu) < p) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/* ---------- compute ------------------------------------------------------- */

/**
 * PURE. Stateless, no UI dependency, no DOM access. Runs in a Web Worker.
 * Deterministic at fixed seed. `seed` is injected by the core.
 * @param {{mu: number, sigma: number, N: number, M: number, conf: number,
 *          known: boolean, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ mu, sigma, N, M, conf, known, seed }) {
  const gauss = gaussFrom(mulberry32(seed));
  const pTail = 1 - (1 - conf) / 2;
  const quantile = (n) => (known ? probit(pTail) : tInv(pTail, n - 1));

  // one sample of size n → mean and CI half-width
  const drawOne = (n, q) => {
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const x = mu + sigma * gauss();
      sum += x;
      sumSq += x * x;
    }
    const mean = sum / n;
    const hw = known
      ? (q * sigma) / Math.sqrt(n)
      : q * Math.sqrt(Math.max((sumSq - n * mean * mean) / (n - 1), 0) / n);
    return { mean, hw };
  };

  const qN = quantile(N);
  const means = new Float64Array(M);
  const intervals = new Array(M);
  let hits = 0;
  let hwSum = 0;
  for (let m = 0; m < M; m++) {
    const { mean, hw } = drawOne(N, qN);
    means[m] = mean;
    const ok = Math.abs(mean - mu) <= hw;
    if (ok) hits++;
    hwSum += hw;
    intervals[m] = { lo: mean - hw, hi: mean + hw, ok };
  }

  // sampling distribution of x̄: N(mu, sigma²/N)
  const se = sigma / Math.sqrt(N);
  const nd = 121;
  const dx = new Float64Array(nd);
  const dy = new Float64Array(nd);
  for (let i = 0; i < nd; i++) {
    const x = mu - 4 * se + (8 * se * i) / (nd - 1);
    dx[i] = x;
    dy[i] = Math.exp(-((x - mu) ** 2) / (2 * se * se)) / (se * Math.sqrt(2 * Math.PI));
  }

  // empirical coverage across a grid of sample sizes (M intervals per point)
  const grid = [2, 3, 5, 8, 12, 18, 27, 40, 60, 90, 135, 200];
  const cx = new Float64Array(grid.length);
  const cy = new Float64Array(grid.length);
  for (let gi = 0; gi < grid.length; gi++) {
    const n = grid[gi];
    const q = quantile(n);
    let h = 0;
    for (let m = 0; m < M; m++) {
      const { mean, hw } = drawOne(n, q);
      if (Math.abs(mean - mu) <= hw) h++;
    }
    cx[gi] = n;
    cy[gi] = h / M;
  }

  return {
    observables: {
      means,
      intervals,
      coverage: { value: hits / M, meta: { label: 'couverture', precision: 3 } },
      meanHalfWidth: { value: hwSum / M, meta: { label: 'demi-largeur', precision: 2 } },
      theoreticalDensity: { x: dx, y: dy },
      coverageVsN: { x: cx, y: cy },
    },
  };
}
