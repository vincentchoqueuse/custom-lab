// Shared numerical library — pure functions with no DOM, UI or d3 dependency,
// importable from compute.js (worker), check.js (Node) and the core alike.
// This is the project's own "custom lib": generic mathematics only, no
// experiment-specific logic (experiments keep their science, they just stop
// re-implementing erf).

/* ---------- descriptive statistics ---------------------------------------- */

/** @param {ArrayLike<number>} a */
export function mean(a) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s / a.length;
}

/**
 * Median (copies, does not mutate). Even length: mean of the two middle
 * values.
 * @param {ArrayLike<number>} a
 */
export function median(a) {
  return medianInPlace(Float64Array.from(a));
}

/**
 * Median computed IN PLACE: `a` is REORDERED and nothing is allocated.
 *
 * Same value as `median` to the bit — a median is an order statistic, so
 * selecting it and sorting for it cannot disagree. The difference is the work:
 * quickselect only partitions around the middle rank instead of ordering
 * everything, O(n) expected against O(n log n), and it needs no copy.
 *
 * That matters where a median sits in a Monte-Carlo loop rather than at the
 * end of a computation: `estimation/cramer-rao` takes 24 000 of them over a
 * scratch buffer, and the copy-and-sort was 60% of the experiment's runtime.
 * Use this ONLY on a buffer whose order is yours to destroy; everywhere else
 * `median` is the same function with a copy in front.
 *
 * @param {Float64Array} a — reordered by the call
 */
export function medianInPlace(a) {
  const n = a.length;
  if (n === 0) return NaN;
  const h = n >> 1;
  select(a, h);
  if (n % 2) return a[h];
  // quickselect leaves everything below h no greater than a[h], so the lower
  // median is the largest of them — one pass, no second selection
  let lo = a[0];
  for (let i = 1; i < h; i++) if (a[i] > lo) lo = a[i];
  return (lo + a[h]) / 2;
}

/** Hoare quickselect: puts the k-th smallest value of `a` at index k. */
function select(a, k) {
  let lo = 0;
  let hi = a.length - 1;
  while (lo < hi) {
    // median-of-three pivot: an already-sorted buffer is the common case here
    // (the caller often re-fills a buffer that was left ordered), and it is
    // exactly the input that makes a naive pivot quadratic
    const mid = (lo + hi) >> 1;
    if (a[mid] < a[lo]) swap(a, mid, lo);
    if (a[hi] < a[lo]) swap(a, hi, lo);
    if (a[hi] < a[mid]) swap(a, hi, mid);
    const p = a[mid];
    let i = lo;
    let j = hi;
    while (i <= j) {
      while (a[i] < p) i++;
      while (a[j] > p) j--;
      if (i <= j) {
        swap(a, i, j);
        i++;
        j--;
      }
    }
    if (k <= j) hi = j;
    else if (k >= i) lo = i;
    else return;
  }
}

function swap(a, i, j) {
  const t = a[i];
  a[i] = a[j];
  a[j] = t;
}

/**
 * Variance. `sample: true` (default) divides by n−1 (unbiased), false by n
 * (MLE).
 * @param {ArrayLike<number>} a
 */
export function variance(a, { sample = true, mean: m = mean(a) } = {}) {
  let ss = 0;
  for (let i = 0; i < a.length; i++) ss += (a[i] - m) ** 2;
  const n = a.length;
  return sample ? (n > 1 ? ss / (n - 1) : 0) : ss / n;
}

/* ---------- helpers shared by compute.js files --------------------------- */

/** Normalized sinc: sin(πx)/(πx), sinc(0) = 1. */
export function sinc(x) {
  return x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
}

/** Decibels → linear power ratio. */
export function dbToLin(db) {
  return 10 ** (db / 10);
}

/**
 * One classic Runge-Kutta 4 step for array states: f(x, t) returns dx/dt.
 * @param {(x: number[], t: number) => number[]} f
 */
export function rk4Step(f, x, t, h) {
  const n = x.length;
  const k1 = f(x, t);
  const k2 = f(x.map((v, i) => v + (h / 2) * k1[i]), t + h / 2);
  const k3 = f(x.map((v, i) => v + (h / 2) * k2[i]), t + h / 2);
  const k4 = f(x.map((v, i) => v + h * k3[i]), t + h);
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = x[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  return out;
}

/** Flat [x0, y0, x1, y1, …] pairs → a {x, y} series observable. */
export function pairsToSeries(arr) {
  const m = arr.length / 2;
  const x = new Float64Array(m);
  const y = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    x[i] = arr[2 * i];
    y[i] = arr[2 * i + 1];
  }
  return { x, y };
}

/* ---------- Gaussian ------------------------------------------------------ */

/** N(mu, sigma²) density. */
export function normalPdf(x, mu = 0, sigma = 1) {
  return Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
}

/** erf — Abramowitz & Stegun 7.1.26, |ε| < 1.5e-7. */
export function erf(x) {
  const s = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return s * y;
}

/** N(mu, sigma²) cumulative distribution function. */
export function normalCdf(x, mu = 0, sigma = 1) {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

/** Gaussian tail Q(x) = P(N(0,1) > x) = 1 − Φ(x). */
export function qfunc(x) {
  return 1 - normalCdf(x);
}

/**
 * Inverse standard normal CDF (probit) — Acklam's rational approximation,
 * |ε| < 1.15e-9.
 */
export function normalQuantile(p) {
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

/* ---------- special functions --------------------------------------------- */

/** Lanczos log-gamma. */
export function logGamma(x) {
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

/**
 * Regularized lower incomplete gamma P(a, x) — the χ² family's CDF, and the
 * counterpart of the incomplete beta already here. Series below a+1, continued
 * fraction above, which is where each converges.
 */
export function gammaP(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    // series: P(a,x) = x^a e^{-x} Σ x^n / (a(a+1)…(a+n))
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 0; n < 500; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  // continued fraction for the UPPER tail Q(a,x), then P = 1 − Q
  const FPMIN = 1e-300;
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/** CDF of a χ² with k degrees of freedom. */
export const chi2Cdf = (x, k) => gammaP(k / 2, x / 2);

/** pdf of a χ² with k degrees of freedom, through logs so large k is safe. */
export function chi2Pdf(x, k) {
  if (x <= 0) return 0;
  return Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - logGamma(k / 2));
}

/**
 * CDF of a NON-CENTRAL χ² — the law of a χ² whose Gaussians are off-centre,
 * which is what every detection problem's H₁ produces. Written as what it is:
 * a Poisson(λ/2) mixture of central χ² with k + 2j degrees of freedom.
 */
export function ncChi2Cdf(x, k, lambda) {
  if (x <= 0) return 0;
  if (lambda <= 0) return chi2Cdf(x, k);
  const half = lambda / 2;
  // start at the Poisson mode and walk outwards, so no term underflows first
  const jMax = Math.max(60, Math.ceil(half + 12 * Math.sqrt(half + 1)));
  let sum = 0;
  let logw = -half; // log P(J = 0)
  for (let j = 0; j <= jMax; j++) {
    if (j > 0) logw += Math.log(half) - Math.log(j);
    const w = Math.exp(logw);
    if (w > 1e-300) sum += w * chi2Cdf(x, k + 2 * j);
    if (j > half && w < 1e-17) break;
  }
  return Math.min(1, sum);
}

/** The x with chi2Cdf(x, k) = p — bisection, which needs no derivative and
 *  cannot leave the bracket. */
export function chi2Quantile(p, k) {
  if (p <= 0) return 0;
  let lo = 0;
  let hi = Math.max(4 * k, 20);
  while (chi2Cdf(hi, k) < p) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (chi2Cdf(mid, k) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** CDF of Fisher's F(d1, d2), through the incomplete beta it already is. */
export const fCdf = (x, d1, d2) =>
  x <= 0 ? 0 : regularizedIncompleteBeta(d1 / 2, d2 / 2, (d1 * x) / (d1 * x + d2));

/** The x with fCdf(x, d1, d2) = p. */
export function fQuantile(p, d1, d2) {
  if (p <= 0) return 0;
  let lo = 0;
  let hi = 10;
  while (fCdf(hi, d1, d2) < p && hi < 1e12) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (fCdf(mid, d1, d2) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Regularized incomplete beta I_x(a, b). */
export function regularizedIncompleteBeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  return x < (a + 1) / (a + b + 2)
    ? (bt * betacf(a, b, x)) / a
    : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/* ---------- Student t ----------------------------------------------------- */

/** Student-t CDF with nu degrees of freedom. */
export function studentCdf(t, nu) {
  const p = 0.5 * regularizedIncompleteBeta(nu / 2, 0.5, nu / (nu + t * t));
  return t >= 0 ? 1 - p : p;
}

/**
 * Student-t quantile (p in (0.5, 1)) by bisection on the exact CDF —
 * accurate down to nu = 1, where series expansions collapse.
 */
export function studentQuantile(p, nu) {
  let hi = 2;
  while (studentCdf(hi, nu) < p && hi < 1e8) hi *= 2;
  let lo = 0;
  for (let i = 0; i < 100; i++) {
    const mid = 0.5 * (lo + hi);
    if (studentCdf(mid, nu) < p) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/* ---------- integration & polynomials ------------------------------------- */

/** Trapezoidal integral of samples y over abscissae x (both ArrayLike). */
export function trapz(x, y) {
  let s = 0;
  for (let i = 1; i < x.length; i++) s += ((y[i] + y[i - 1]) / 2) * (x[i] - x[i - 1]);
  return s;
}

/** Horner evaluation of a polynomial with ascending coefficients. */
export function polyval(coeffs, x) {
  let y = 0;
  for (let k = coeffs.length - 1; k >= 0; k--) y = y * x + coeffs[k];
  return y;
}

/* ---------- linear algebra ------------------------------------------------ */



/**
 * In-place iterative radix-2 FFT of the complex signal (re, im).
 * Length must be a power of two. Promoted from the windowing experiment
 * when the spectrogram became the second spectral consumer (repo rule:
 * a pattern repeated twice becomes a generic).
 * @param {Float64Array} re — real part (mutated)
 * @param {Float64Array} im — imaginary part (mutated)
 */
// jacobiSym and solveLinearSystem moved to core/linalg.js the day matrix
// algebra served three subjects: numeric.js keeps the SCALAR side (erf,
// Student, trapz), linalg.js takes everything matrix-shaped, dsp.js the signal
// layer. Three modules, three readable borders.

export function fft(re, im) {
  const n = re.length;
  if (n !== im.length || (n & (n - 1)) !== 0) {
    throw new Error(`fft: length must be a power of two (got ${n})`);
  }
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j |= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const k = i + j;
        const l = k + len / 2;
        const tr = re[l] * cr - im[l] * ci;
        const ti = re[l] * ci + im[l] * cr;
        re[l] = re[k] - tr;
        im[l] = im[k] - ti;
        re[k] += tr;
        im[k] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/**
 * Amplitude → decibels with an optional display floor:
 * 20·log10(a), clamped below at `floor` (exact zeros stay finite).
 */
export function toDb(a, floor = -Infinity) {
  return Math.max(floor, 20 * Math.log10(a + 1e-300));
}

/**
 * Canonical window sample (rect / hann / hamming / blackman).
 * Periodic (DFT-even, divisor N — spectral analysis: exact ENBW/Parseval
 * identities) by default; `symmetric` (divisor N−1 — FIR design: exact
 * linear phase) on demand.
 * @param {'rect'|'hann'|'hamming'|'blackman'} win
 */
export function windowValue(win, n, N, symmetric = false) {
  if (win === 'rect') return 1;
  const c = Math.cos((2 * Math.PI * n) / (symmetric ? N - 1 : N));
  if (win === 'hann') return 0.5 - 0.5 * c;
  if (win === 'hamming') return 0.54 - 0.46 * c;
  const c2 = Math.cos((4 * Math.PI * n) / (symmetric ? N - 1 : N));
  return 0.42 - 0.5 * c + 0.08 * c2; // blackman
}

/**
 * Complex Horner evaluation of a real polynomial (descending powers) at
 * the complex point re + j·im. Returns [Re, Im].
 */
export function polyEvalComplex(c, re, im) {
  let ar = 0;
  let ai = 0;
  for (const v of c) {
    const nr = ar * re - ai * im + v;
    ai = ar * im + ai * re;
    ar = nr;
  }
  return [ar, ai];
}
