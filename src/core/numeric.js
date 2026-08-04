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
  const s = Float64Array.from(a).sort();
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
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
 * Solve A·z = b by Gaussian elimination with partial pivoting.
 * A is an array of rows (mutated), b an array (mutated). Suited to the small
 * dense systems of this project (normal equations, d ≤ 10) — not a BLAS.
 * @returns {Float64Array}
 */
export function solveLinearSystem(A, b) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    }
    if (A[piv][col] === 0) throw new Error('singular linear system');
    if (piv !== col) {
      [A[piv], A[col]] = [A[col], A[piv]];
      [b[piv], b[col]] = [b[col], b[piv]];
    }
    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / A[col][col];
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c];
      b[r] -= f * b[col];
    }
  }
  const z = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let c = r + 1; c < n; c++) s -= A[r][c] * z[c];
    z[r] = s / A[r][r];
  }
  return z;
}

/**
 * Valeurs et vecteurs propres d'une matrice SYMÉTRIQUE RÉELLE n×n, par
 * rotations de Jacobi cycliques.
 *
 * Jacobi et pas QR : les matrices que le projet décompose sont petites
 * (n ≤ 64 — une covariance de sous-espace, une autocorrélation de filtre
 * adaptatif), la convergence est garantie sans décalage ni cas
 * particulier, et surtout le résultat est exact au sens où on peut le
 * vérifier — l'orthogonalité est maintenue par construction puisqu'on
 * n'applique que des rotations.
 *
 * @param {Float64Array} a  n×n en ligne majeure — MODIFIÉE en place
 * @returns {{values: Float64Array, vectors: Float64Array}} vecteurs en
 *          COLONNES : v_k[i] = vectors[i*n + k]
 */
export function jacobiSym(a, n) {
  const v = new Float64Array(n * n);
  for (let i = 0; i < n; i++) v[i * n + i] = 1;

  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) off += a[p * n + q] * a[p * n + q];
    if (off < 1e-30) break;

    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p * n + q];
        if (Math.abs(apq) < 1e-300) continue;
        const theta = (a[q * n + q] - a[p * n + p]) / (2 * apq);
        const t =
          Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k * n + p];
          const akq = a[k * n + q];
          a[k * n + p] = c * akp - s * akq;
          a[k * n + q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p * n + k];
          const aqk = a[q * n + k];
          a[p * n + k] = c * apk - s * aqk;
          a[q * n + k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k * n + p];
          const vkq = v[k * n + q];
          v[k * n + p] = c * vkp - s * vkq;
          v[k * n + q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const values = new Float64Array(n);
  for (let i = 0; i < n; i++) values[i] = a[i * n + i];
  return { values, vectors: v };
}

/**
 * In-place iterative radix-2 FFT of the complex signal (re, im).
 * Length must be a power of two. Promoted from the windowing experiment
 * when the spectrogram became the second spectral consumer (repo rule:
 * a pattern repeated twice becomes a generic).
 * @param {Float64Array} re — real part (mutated)
 * @param {Float64Array} im — imaginary part (mutated)
 */
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
