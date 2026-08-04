// The catalogue's linear algebra — and NOTHING MORE than what it uses.
//
// This module holds a border with `numeric.js` (the scalar side: erf, Student,
// trapz, fft) and `dsp.js` (the signal side): here, everything that takes a
// matrix. It was opened the day three subjects started writing the same loops —
// eigendecomposition in spectral analysis, in adaptive filtering and in PCA;
// normal equations in polynomial regression and in basis regression;
// matrix–vector products in filtering and in learning.
//
// WHAT IT DELIBERATELY DOES NOT CONTAIN: LU, QR, Cholesky, determinant,
// inverse. No experiment uses them, so NO CHECK would exercise them — and a
// wrong decomposition nobody tests is worse than no decomposition at all,
// because it gets trusted the day it is needed. Principle 7 of the project says
// as much; this paragraph is here to be remembered at the moment of "completing
// the toolbox".
//
// The SVD IS here — and the way it arrived is the rule in action: it came in
// the day an experiment exercised it (image compression), with its identities
// in the harness, and not the day before "because a linear-algebra box has an
// SVD".
//
// Convention: an n × m matrix is a `Float64Array` of n·m in ROW MAJOR order,
// A[i][j] = A[i * m + j]. Except `solveLinearSystem`, inherited, which takes an
// array of arrays — its signature has not moved so as not to disturb the four
// experiments that call it.
//
// PURE, stateless, no DOM. Importable from compute.js AND check.js.

/**
 * y = A·x, with A of rows × cols in row-major order.
 * The operation of a linear layer, and of any repeated inner product.
 */
export function matvec(A, x, rows, cols) {
  const y = new Float64Array(rows);
  for (let i = 0; i < rows; i++) {
    let s = 0;
    const off = i * cols;
    for (let j = 0; j < cols; j++) s += A[off + j] * x[j];
    y[i] = s;
  }
  return y;
}

/**
 * xᵀAx — the quadratic form. It is a POWER when A is a covariance: that of a
 * filter at its input, that of a coefficient error, that of a projection.
 * Three experiments compute it, each for a different reason, with the same
 * loop.
 */
export function quadForm(A, x, n) {
  let s = 0;
  for (let i = 0; i < n; i++) {
    let row = 0;
    const off = i * n;
    for (let j = 0; j < n; j++) row += A[off + j] * x[j];
    s += x[i] * row;
  }
  return s;
}

/**
 * Solves a dense linear system by Gaussian elimination with PARTIAL PIVOTING.
 * A and b are MODIFIED.
 *
 * The pivot is not a stylistic precaution: without it, a perfectly invertible
 * matrix whose first coefficient happens to be small gives a wrong result with
 * nothing to signal it. Good up to some thirty unknowns, which covers the whole
 * catalogue.
 *
 * @param {number[][]} A array of rows
 * @param {number[]} b
 * @returns {number[]} the solution
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
    const p = A[col][col];
    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / p;
      if (f === 0) continue;
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c];
      b[r] -= f * b[col];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
    x[i] = s / A[i][i];
  }
  return x;
}

/**
 * Eigenvalues and eigenvectors of a REAL SYMMETRIC n×n matrix, by cyclic
 * Jacobi rotations.
 *
 * Jacobi rather than QR: the matrices this project decomposes are small (n ≤ 64
 * — a subspace covariance, an adaptive-filter autocorrelation, a PCA
 * correlation matrix), convergence is guaranteed with no shift and no special
 * case, and above all the result is exact in the sense that it can be checked —
 * orthogonality is maintained by construction, since only rotations are
 * applied.
 *
 * @param {Float64Array} a  n×n in row-major order — MODIFIED in place
 * @returns {{values: Float64Array, vectors: Float64Array}} vectors in COLUMNS:
 *          v_k[i] = vectors[i*n + k]
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
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
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
 * The NORMAL EQUATIONS of a linear fit, accumulated in one pass: AᵀA and Aᵀy,
 * without ever forming A.
 *
 * `row(i, out)` fills `out` with the i-th row of the design matrix — powers of
 * x for a polynomial regression, basis functions for a basis regression,
 * exponentials for an amplitude estimation. That is the only place where the
 * three differ, which is why it is passed as an argument.
 *
 * Never forming A explicitly is not an optimization: it is what allows fitting
 * ten thousand points without allocating ten thousand rows.
 *
 * @returns {{AtA: number[][], Aty: number[]}}
 */
export function normalEquations(n, cols, row, y) {
  const AtA = Array.from({ length: cols }, () => new Array(cols).fill(0));
  const Aty = new Array(cols).fill(0);
  const r = new Array(cols);
  for (let i = 0; i < n; i++) {
    row(i, r);
    const yi = typeof y === 'function' ? y(i) : y[i];
    for (let j = 0; j < cols; j++) {
      Aty[j] += yi * r[j];
      for (let l = j; l < cols; l++) AtA[j][l] += r[j] * r[l];
    }
  }
  for (let j = 0; j < cols; j++) for (let l = 0; l < j; l++) AtA[j][l] = AtA[l][j];
  return { AtA, Aty };
}

/**
 * Solves (AᵀA + λD)·w = Aᵀy without modifying its inputs. λ = 0 gives ordinary
 * least squares, and the harness verifies that continuity.
 *
 * `skipFirst` keeps the constant term OUT of the penalty, which is the
 * convention in regression: penalizing the intercept would favour models
 * passing near zero, which has no physical meaning and depends on where the
 * origin happens to have been placed.
 */
export function ridgeSolve(AtA, Aty, lambda, { skipFirst = false } = {}) {
  const A = AtA.map((r, j) => {
    const copy = Array.from(r);
    if (!skipFirst || j > 0) copy[j] += lambda;
    return copy;
  });
  return solveLinearSystem(A, Array.from(Aty));
}

/**
 * SINGULAR VALUE DECOMPOSITION of a real m × n matrix:
 * A = U·diag(σ)·Vᵀ, with σ decreasing.
 *
 * It enters here the day an experiment exercises it — image compression — and
 * not before, in keeping with this module's header.
 *
 * The route chosen: diagonalize AᵀA (symmetric, n × n) with the Jacobi routine
 * above, giving V and σ²; then U = A·V/σ. That is the textbook construction, it
 * fits in fifteen lines, and its weakness is known and documented — the SMALL
 * singular values lose relative accuracy, since they are reached through their
 * square (σ ≈ √ε·σmax is the floor). For a compression that keeps the large
 * ones and discards the small ones this is harmless, and the harness bounds the
 * full reconstruction error at 1e-10, which proves it rather than assuming it.
 *
 * The columns of U matching a zero singular value are not completed into an
 * orthonormal basis: they stay zero. A reconstruction never uses them, and
 * claiming to have computed them would be a lie.
 *
 * @param {Float64Array} A m × n in row-major order (not modified)
 * @returns {{u: Float64Array, s: Float64Array, v: Float64Array, rank: number}}
 *   u is m × r, v is n × r, both row-major, with r = min(m, n).
 */
export function svd(A, m, n) {
  const r = Math.min(m, n);

  // AᵀA, symmetric n × n
  const AtA = new Float64Array(n * n);
  for (let a = 0; a < n; a++)
    for (let b = a; b < n; b++) {
      let acc = 0;
      for (let i = 0; i < m; i++) acc += A[i * n + a] * A[i * n + b];
      AtA[a * n + b] = acc;
      AtA[b * n + a] = acc;
    }

  const eig = jacobiSym(AtA, n);
  const order = Array.from({ length: n }, (_, k) => k).sort(
    (a, b) => eig.values[b] - eig.values[a]
  );

  const s = new Float64Array(r);
  const v = new Float64Array(n * r);
  for (let k = 0; k < r; k++) {
    const src = order[k];
    s[k] = Math.sqrt(Math.max(eig.values[src], 0));
    for (let j = 0; j < n; j++) v[j * r + k] = eig.vectors[j * n + src];
  }

  // The NUMERICAL rank, and its threshold is the one this route imposes: going
  // through AᵀA loses half the digits, so a genuinely zero singular value comes
  // out around √ε·σmax rather than ε·σmax. Counting with the usual ε threshold
  // would give 65 instead of 4 on an image built with rank 4 — a wrong number,
  // and the harness checks it.
  const rankTol = Math.max(m, n) * Math.sqrt(Number.EPSILON) * (s[0] || 1);
  let rank = 0;
  for (let k = 0; k < r; k++) if (s[k] > rankTol) rank++;

  // U = A·V/σ, column by column; a zero σ leaves its column at zero
  const u = new Float64Array(m * r);
  const tol = 1e-12 * (s[0] || 1);
  for (let k = 0; k < r; k++) {
    if (s[k] <= tol) continue;
    const inv = 1 / s[k];
    for (let i = 0; i < m; i++) {
      let acc = 0;
      const off = i * n;
      for (let j = 0; j < n; j++) acc += A[off + j] * v[j * r + k];
      u[i * r + k] = acc * inv;
    }
  }
  return { u, s, v, rank };
}

/**
 * La meilleure approximation de rang k : Aₖ = Σ_{i<k} σᵢ·uᵢvᵢᵀ.
 *
 * "Best" is not a figure of speech — Eckart–Young says that
 * ‖A − Aₖ‖²_F = Σ_{i≥k} σᵢ², and that no rank-k matrix does better. It is the
 * same theorem as the one behind PCA, on the same page.
 */
export function lowRank(model, m, n, k) {
  const { u, s, v } = model;
  const r = s.length;
  const out = new Float64Array(m * n);
  const kk = Math.min(k, r);
  for (let c = 0; c < kk; c++) {
    const sc = s[c];
    if (sc === 0) continue;
    for (let i = 0; i < m; i++) {
      const ui = sc * u[i * r + c];
      if (ui === 0) continue;
      const off = i * n;
      for (let j = 0; j < n; j++) out[off + j] += ui * v[j * r + c];
    }
  }
  return out;
}
