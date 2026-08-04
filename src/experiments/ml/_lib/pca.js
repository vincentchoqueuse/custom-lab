// Principal component analysis, reduced to what it is: the eigendecomposition
// of a covariance matrix.
//
// It is exactly the building block of the high-resolution spectral subject,
// where the eigenvalues of a covariance separated signal from noise. Here they
// separate what varies from what does not — same algebra, another reading. The
// symmetric Jacobi comes from the core, since three subjects now use it.
//
// PURE, stateless, no DOM. Importable from compute.js AND check.js.

import { jacobiSym } from '../../../core/linalg.js';

/** Mean of each column. */
export function colMeans(X, n, p) {
  const m = new Float64Array(p);
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) m[j] += X[i * p + j] / n;
  return m;
}

/** Standard deviation (unbiased) of each column. */
export function colSds(X, n, p, means = colMeans(X, n, p)) {
  const s = new Float64Array(p);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < p; j++) s[j] += (X[i * p + j] - means[j]) ** 2 / (n - 1);
  for (let j = 0; j < p; j++) s[j] = Math.sqrt(s[j]);
  return s;
}

/**
 * The full PCA.
 *
 * `standardize` chooses between the TWO PCAs, and that is not a tuning
 * detail: without standardization one diagonalizes the COVARIANCE, so the
 * variable carrying the largest numbers dominates — on iris, petal length has
 * a variance of 3.1 cm² against 0.19 for sepal width, and the first component
 * is almost nothing but it. With standardization one diagonalizes the
 * CORRELATION, and the four variables weigh the same. Changing units
 * (centimetres to millimetres) would change the first result and not the
 * second.
 *
 * @param {Float64Array|number[]} X n × p data, row major
 * @returns {{values, vectors, means, sds, scores, ratio, cumulative, total}}
 *   `vectors` in COLUMNS (v_k[j] = vectors[j*p + k]), values decreasing.
 */
export function pca(X, n, p, { standardize = false } = {}) {
  const data = Float64Array.from(X);
  const means = colMeans(data, n, p);
  const sds = standardize ? colSds(data, n, p, means) : new Float64Array(p).fill(1);

  // centring (and scaling when asked for)
  const Z = new Float64Array(n * p);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < p; j++) Z[i * p + j] = (data[i * p + j] - means[j]) / sds[j];

  // covariance (or correlation) — symmetric by construction
  const C = new Float64Array(p * p);
  for (let a = 0; a < p; a++)
    for (let b = a; b < p; b++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += Z[i * p + a] * Z[i * p + b];
      s /= n - 1;
      C[a * p + b] = s;
      C[b * p + a] = s;
    }

  const eig = jacobiSym(Float64Array.from(C), p);

  // sorted decreasing, and SIGN FIXED: an eigenvector is defined up to sign,
  // so without a convention the cloud flips from one compute to the next. The
  // rule imposed here is "the component of largest modulus is positive", the
  // most widespread convention and the only one that makes the figures
  // reproducible from one run to another.
  const order = Array.from({ length: p }, (_, k) => k).sort(
    (a, b) => eig.values[b] - eig.values[a]
  );
  const values = new Float64Array(p);
  const vectors = new Float64Array(p * p);
  for (let k = 0; k < p; k++) {
    const src = order[k];
    values[k] = eig.values[src];
    let big = 0;
    for (let j = 1; j < p; j++)
      if (Math.abs(eig.vectors[j * p + src]) > Math.abs(eig.vectors[big * p + src])) big = j;
    const sign = eig.vectors[big * p + src] >= 0 ? 1 : -1;
    for (let j = 0; j < p; j++) vectors[j * p + k] = sign * eig.vectors[j * p + src];
  }

  // the scores: the data projected onto the components
  const scores = new Float64Array(n * p);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < p; k++) {
      let s = 0;
      for (let j = 0; j < p; j++) s += Z[i * p + j] * vectors[j * p + k];
      scores[i * p + k] = s;
    }

  let total = 0;
  for (let k = 0; k < p; k++) total += values[k];
  const ratio = new Float64Array(p);
  const cumulative = new Float64Array(p);
  let acc = 0;
  for (let k = 0; k < p; k++) {
    ratio[k] = values[k] / total;
    acc += ratio[k];
    cumulative[k] = acc;
  }

  return { values, vectors, means, sds, scores, ratio, cumulative, total, centered: Z, cov: C };
}

/**
 * Reconstruction from the first k components, in the original units. This is
 * the "compression" use of PCA, and the error it leaves has an EXACT value:
 * the sum of the discarded eigenvalues (Eckart–Young). The harness pins it.
 */
export function reconstruct(model, n, p, k) {
  const { vectors, scores, means, sds } = model;
  const out = new Float64Array(n * p);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < p; j++) {
      let s = 0;
      for (let c = 0; c < k; c++) s += scores[i * p + c] * vectors[j * p + c];
      out[i * p + j] = s * sds[j] + means[j];
    }
  return out;
}

/** Mean squared error PER INDIVIDUAL between two n × p arrays. */
export function meanSquaredError(A, B, n, p) {
  let s = 0;
  for (let i = 0; i < n * p; i++) s += (A[i] - B[i]) ** 2;
  return s / n;
}
