// The algebra of the high-resolution methods — the noise subspace, and what
// gets drawn from it.
//
// Everything starts from an M×M Hermitian covariance matrix and its
// eigendecomposition. That is THE building block, and it is also the one thing
// no small JS library can do: `ml-matrix` only decomposes real matrices,
// `mathjs` neither and weighs seven times more, and a WASM port of Eigen would
// cost a megabyte against the build's Safari 11 target. With either of them the
// embedding below would be needed ANYWAY — after which only a Jacobi routine
// remains, some sixty lines that can be checked line by line. So they are
// written here, and the harness pins them: R·v = λ·v to 1e-12, orthonormal
// vectors to 1e-12.
//
// Complex convention: pairs of Float64Array {re, im} everywhere, never one
// object per element — the loops are hot and the project contract forbids
// arrays of objects on critical paths.
//
// PURE: no DOM, no state. Importable from compute.js and check.js.
//
// The real symmetric Jacobi routine underneath moved to core/linalg.js the day
// a second subject needed it (adaptive filtering: the conditioning of the
// autocorrelation matrix IS the speed of LMS). That is the project rule — what
// serves ONE subject lives with it, what serves several moves up into the
// core.
import { jacobiSym } from '../../../core/linalg.js';

/**
 * Eigenvalues and eigenvectors of a complex HERMITIAN M×M matrix, sorted by
 * DECREASING eigenvalue.
 *
 * The classical embedding: a Hermitian A = X + jY (X symmetric, Y
 * antisymmetric) becomes
 *
 *     B = [ X  −Y ]   real symmetric 2M×2M
 *         [ Y   X ]
 *
 * in which every eigenvalue of A appears TWICE, and whose eigenvector (u ; w)
 * gives the complex vector u + j·w. One pair in two is kept after sorting — and
 * the fact that the values do come out paired is itself verified by the
 * harness, because that is what makes the deduplication legitimate rather than
 * optimistic.
 *
 * @param {Float64Array} re  M×M, real part (symmetric)
 * @param {Float64Array} im  M×M, imaginary part (antisymmetric)
 * @returns {{values: Float64Array, re: Float64Array, im: Float64Array}}
 *          M decreasing values; vectors in COLUMNS, v_k[i] at [i*M+k]
 */
export function hermitianEig(re, im, M) {
  const n = 2 * M;
  const b = new Float64Array(n * n);
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      b[i * n + j] = re[i * M + j];
      b[i * n + (j + M)] = -im[i * M + j];
      b[(i + M) * n + j] = im[i * M + j];
      b[(i + M) * n + (j + M)] = re[i * M + j];
    }
  }
  const { values, vectors } = jacobiSym(b, n);

  const idx = Array.from({ length: n }, (_, k) => k).sort((p, q) => values[q] - values[p]);
  // one value in two: the 2M values are M exact pairs
  const outV = new Float64Array(M);
  const outRe = new Float64Array(M * M);
  const outIm = new Float64Array(M * M);
  for (let k = 0; k < M; k++) {
    const c = idx[2 * k];
    outV[k] = values[c];
    let norm = 0;
    for (let i = 0; i < M; i++) {
      const u = vectors[i * n + c];
      const w = vectors[(i + M) * n + c];
      norm += u * u + w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < M; i++) {
      outRe[i * M + k] = vectors[i * n + c] / norm;
      outIm[i * M + k] = vectors[(i + M) * n + c] / norm;
    }
  }
  return { values: outV, re: outRe, im: outIm };
}

/**
 * Covariance estimated from a complex record, by sliding windows (a Hankel
 * matrix) and then FORWARD-BACKWARD averaging.
 *
 * Forward-backward averaging is not a refinement: on a single record the L
 * sliding snapshots are correlated, and without it the rank of the signal
 * subspace is underestimated as soon as two sources are close — MUSIC would see
 * only one of them, for a reason having nothing to do with the resolution being
 * demonstrated.
 *
 * @param {Float64Array} xr, xi  the complex record
 * @param {number} M             order of the covariance
 */
export function covariance(xr, xi, M) {
  const N = xr.length;
  const L = N - M + 1;
  const re = new Float64Array(M * M);
  const im = new Float64Array(M * M);
  for (let l = 0; l < L; l++) {
    for (let i = 0; i < M; i++) {
      const ar = xr[l + i];
      const ai = xi[l + i];
      for (let j = 0; j < M; j++) {
        // R += x xᴴ  →  R[i][j] += x_i · conj(x_j)
        const br = xr[l + j];
        const bi = xi[l + j];
        re[i * M + j] += ar * br + ai * bi;
        im[i * M + j] += ai * br - ar * bi;
      }
    }
  }
  // backward: R_b = J R* J, averaged with R
  const fr = new Float64Array(M * M);
  const fi = new Float64Array(M * M);
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      const bi = (M - 1 - i) * M + (M - 1 - j);
      fr[i * M + j] = (re[i * M + j] + re[bi]) / (2 * L);
      fi[i * M + j] = (im[i * M + j] - im[bi]) / (2 * L);
    }
  }
  return { re: fr, im: fi, snapshots: L };
}

/**
 * MUSIC pseudo-spectrum: 1 / ‖Eₙᴴ a(f)‖², with a(f) = [1, e^{j2πf}, …].
 * This is NOT a power spectral density — it is the inverse of a distance to the
 * noise subspace, and its ordinates have no physical unit. Hence the name,
 * which is worth keeping in front of a room.
 *
 * @param {{re, im}} vec   eigenvectors (columns), M×M
 * @param {number} d       number of eigenvalues taken as signal
 * @param {Float64Array} f normalized frequencies (cycles per sample)
 */
export function musicPseudo(vec, M, d, f) {
  const out = new Float64Array(f.length);
  for (let k = 0; k < f.length; k++) {
    const w = 2 * Math.PI * f[k];
    let acc = 0;
    for (let c = d; c < M; c++) {
      // ⟨v_c, a(f)⟩ = Σ_i conj(v_c[i]) e^{jωi}
      let sr = 0;
      let si = 0;
      for (let i = 0; i < M; i++) {
        const vr = vec.re[i * M + c];
        const vi = vec.im[i * M + c];
        const cs = Math.cos(w * i);
        const sn = Math.sin(w * i);
        sr += vr * cs + vi * sn;
        si += vr * sn - vi * cs;
      }
      acc += sr * sr + si * si;
    }
    out[k] = 1 / Math.max(acc, 1e-300);
  }
  return out;
}

/* ---------------------------------------------------------------------- */
/* Racines d'un polynôme à coefficients COMPLEXES — pour root-MUSIC        */
/* ---------------------------------------------------------------------- */
//
// `control/_lib/lti.js` already has a Durand–Kerner, but with REAL
// coefficients: the poles of a transfer function are real-coefficient roots.
// The root-MUSIC polynomial is not (its coefficients are the diagonals of a
// Hermitian matrix), so it is the same scheme over another field, not the same
// code. Two implementations for two fields is the honest price; at a third
// caller, the complex version would move into the core and absorb the other.

/**
 * Complex roots of a polynomial with complex coefficients, in decreasing
 * powers, by Durand–Kerner. FIXED starting points: the computation must be
 * deterministic at equal parameters, which is the project contract.
 *
 * @param {Float64Array} cr, ci  coefficients, cr[0] = highest degree
 * @returns {{re: Float64Array, im: Float64Array}}
 */
export function polyRootsComplex(cr, ci) {
  const n = cr.length - 1;
  if (n < 1) return { re: new Float64Array(0), im: new Float64Array(0) };
  // unitaire
  const a0r = cr[0];
  const a0i = ci[0];
  const d0 = a0r * a0r + a0i * a0i;
  const ar = new Float64Array(n + 1);
  const ai = new Float64Array(n + 1);
  for (let k = 0; k <= n; k++) {
    ar[k] = (cr[k] * a0r + ci[k] * a0i) / d0;
    ai[k] = (ci[k] * a0r - cr[k] * a0i) / d0;
  }
  const evalAt = (zr, zi) => {
    let pr = 0;
    let pi = 0;
    for (let k = 0; k <= n; k++) {
      const t = pr * zr - pi * zi + ar[k];
      pi = pr * zi + pi * zr + ai[k];
      pr = t;
    }
    return [pr, pi];
  };
  // Starting radius: the Cauchy bound, CAPPED. At high degree it is enough to
  // overflow the Horner evaluation (R^n), and root-MUSIC works at degree
  // 2(M−1) — 62 for M = 32. The cap keeps R^n inside doubles with twenty orders
  // of magnitude to spare.
  let R = 1;
  for (let k = 1; k <= n; k++) R = Math.max(R, Math.hypot(ar[k], ai[k]));
  R = Math.min(1 + R, 10 ** (288 / n));
  const zr = new Float64Array(n);
  const zi = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const th = (2 * Math.PI * k) / n + 0.4;
    zr[k] = 0.6 * R * Math.cos(th);
    zi[k] = 0.6 * R * Math.sin(th);
  }
  for (let it = 0; it < 500; it++) {
    let move = 0;
    for (let k = 0; k < n; k++) {
      // Weierstrass correction p(z_k) / Π_{j≠k}(z_k − z_j), divided AS IT GOES
      // rather than formed as a product and divided once. The product of 61
      // factors reached 1e183, its squared modulus infinity, and the quotient
      // became NaN: root-MUSIC returned nothing at all from M = 32 upward,
      // while M = 28 went through. Dividing at each step keeps the magnitudes
      // bounded and changes nothing in the result.
      let [qr, qi] = evalAt(zr[k], zi[k]);
      for (let j = 0; j < n; j++) {
        if (j === k) continue;
        const er = zr[k] - zr[j];
        const ei = zi[k] - zi[j];
        const m = er * er + ei * ei;
        if (!(m > 1e-300)) {
          qr = 0;
          qi = 0;
          break;
        }
        const t = (qr * er + qi * ei) / m;
        qi = (qi * er - qr * ei) / m;
        qr = t;
      }
      if (!Number.isFinite(qr) || !Number.isFinite(qi)) continue;
      zr[k] -= qr;
      zi[k] -= qi;
      move = Math.max(move, Math.hypot(qr, qi));
    }
    if (move < 1e-15) break;
  }
  return { re: zr, im: zi };
}

/**
 * root-MUSIC: instead of sweeping the pseudo-spectrum, its denominator is set
 * to ZERO. The polynomial
 *
 *   Q(z) = Σ_k c_k z^{-k},   c_k = sum of the k-th diagonal of EₙEₙᴴ
 *
 * has its zeros exactly on the unit circle at the source frequencies (with no
 * noise). The d INNER roots closest to the circle are therefore taken: no grid,
 * hence no resolution limited by a sweep step — the estimate is continuous,
 * which swept MUSIC cannot be.
 *
 * @returns {Float64Array} d normalized frequencies, increasing
 */
export function rootMusic(vec, M, d) {
  // C = Eₙ Eₙᴴ, then its diagonals
  const cr = new Float64Array(M * M);
  const ci = new Float64Array(M * M);
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      let sr = 0;
      let si = 0;
      for (let c = d; c < M; c++) {
        const ar = vec.re[i * M + c];
        const ai = vec.im[i * M + c];
        const br = vec.re[j * M + c];
        const bi = vec.im[j * M + c];
        sr += ar * br + ai * bi; // a · conj(b)
        si += ai * br - ar * bi;
      }
      cr[i * M + j] = sr;
      ci[i * M + j] = si;
    }
  }
  // coefficients of the degree 2(M−1) polynomial: k from −(M−1) to (M−1)
  const deg = 2 * (M - 1);
  const pr = new Float64Array(deg + 1);
  const pi = new Float64Array(deg + 1);
  for (let k = -(M - 1); k <= M - 1; k++) {
    let sr = 0;
    let si = 0;
    for (let i = 0; i < M; i++) {
      const j = i - k;
      if (j < 0 || j >= M) continue;
      sr += cr[i * M + j];
      si += ci[i * M + j];
    }
    // z^{-k} · z^{M-1} → power (M−1−k), stored in decreasing degrees
    const p = deg - (M - 1 - k);
    pr[p] = sr;
    pi[p] = si;
  }
  const roots = polyRootsComplex(pr, pi);
  // The roots come in conjugate-reciprocal pairs (z, 1/z*) at the SAME ANGLE:
  // on the unit circle those two merge into a double root, and the iteration
  // then places its two iterates on the same side as often as one on each.
  // Taking "the d closest to the circle from inside" therefore spent two slots
  // on a single source, and a source disappeared — 1.2 Hz of error instead of
  // 1e-6.
  //
  // So they are grouped by angle before choosing. The threshold is very tight
  // (1e-6 in normalized frequency) because the two members of a pair have
  // rigorously the same angle, while two distinct sources, even at
  // 0.3 × Fs/N, are a thousand times further apart.
  const ANG_TOL = 1e-6;
  const cand = [];
  for (let k = 0; k < roots.re.length; k++) {
    const r = Math.hypot(roots.re[k], roots.im[k]);
    if (r > 1 + 1e-6) continue;
    let a = Math.atan2(roots.im[k], roots.re[k]) / (2 * Math.PI);
    if (a < 0) a += 1;
    const dist = Math.abs(1 - r);
    const hit = cand.find((c) => Math.abs(c.f - a) < ANG_TOL || Math.abs(c.f - a) > 1 - ANG_TOL);
    if (hit) {
      if (dist < hit.dist) {
        hit.dist = dist;
        hit.f = a;
      }
    } else cand.push({ f: a, dist });
  }
  cand.sort((p, q) => p.dist - q.dist);
  const f = cand
    .slice(0, d)
    .map((c) => c.f)
    .sort((p, q) => p - q);
  return Float64Array.from(f);
}

/**
 * ESPRIT: the shift structure of the SIGNAL subspace is enough, without ever
 * forming a spectrum. If Eₛ spans the signal, its two submatrices shifted by
 * one row satisfy E₁ Ψ = E₂, and the eigenvalues of Ψ are the e^{j2πf_k}. No
 * grid, no sweep: the frequency comes out of solving a linear system.
 *
 * Ψ is solved in the least-squares sense through the normal equations, and its
 * eigenvalues are obtained in closed form for d ≤ 2 (the lecture case) and by
 * elementary QR iteration beyond.
 *
 * @returns {Float64Array} d normalized frequencies, increasing
 */
export function esprit(vec, M, d) {
  const m = M - 1;
  // E1 = rows 0..M-2 of the first d columns, E2 = rows 1..M-1
  const g = (rowOff, i, c) => [vec.re[(i + rowOff) * M + c], vec.im[(i + rowOff) * M + c]];
  // A = E1ᴴE1 (d×d), B = E1ᴴE2 (d×d)
  const Ar = new Float64Array(d * d);
  const Ai = new Float64Array(d * d);
  const Br = new Float64Array(d * d);
  const Bi = new Float64Array(d * d);
  for (let p = 0; p < d; p++) {
    for (let q = 0; q < d; q++) {
      let ar = 0;
      let ai = 0;
      let br = 0;
      let bi = 0;
      for (let i = 0; i < m; i++) {
        const [ur, ui] = g(0, i, p);
        const [vr, vi] = g(0, i, q);
        const [wr, wi] = g(1, i, q);
        ar += ur * vr + ui * vi; // conj(u)·v
        ai += ur * vi - ui * vr;
        br += ur * wr + ui * wi;
        bi += ur * wi - ui * wr;
      }
      Ar[p * d + q] = ar;
      Ai[p * d + q] = ai;
      Br[p * d + q] = br;
      Bi[p * d + q] = bi;
    }
  }
  // Ψ = A⁻¹B, by complex Gaussian elimination (d ≤ 4)
  const psi = solveComplex(Ar, Ai, Br, Bi, d);
  const ev = eigComplexSmall(psi.re, psi.im, d);
  const f = [];
  for (let k = 0; k < d; k++) {
    let v = Math.atan2(ev.im[k], ev.re[k]) / (2 * Math.PI);
    f.push(v < 0 ? v + 1 : v);
  }
  f.sort((p, q) => p - q);
  return Float64Array.from(f);
}

/** A X = B, complexe, par élimination de Gauss avec pivot partiel. */
export function solveComplex(ar, ai, br, bi, n) {
  const A = { re: Float64Array.from(ar), im: Float64Array.from(ai) };
  const X = { re: Float64Array.from(br), im: Float64Array.from(bi) };
  for (let col = 0; col < n; col++) {
    let piv = col;
    let best = -1;
    for (let r = col; r < n; r++) {
      const m = Math.hypot(A.re[r * n + col], A.im[r * n + col]);
      if (m > best) {
        best = m;
        piv = r;
      }
    }
    if (piv !== col) {
      for (let c = 0; c < n; c++) {
        for (const T of [A, X]) {
          const t1 = T.re[col * n + c];
          T.re[col * n + c] = T.re[piv * n + c];
          T.re[piv * n + c] = t1;
          const t2 = T.im[col * n + c];
          T.im[col * n + c] = T.im[piv * n + c];
          T.im[piv * n + c] = t2;
        }
      }
    }
    const dr = A.re[col * n + col];
    const di = A.im[col * n + col];
    const dd = dr * dr + di * di || 1e-300;
    for (let c = 0; c < n; c++) {
      for (const T of [A, X]) {
        const xr = T.re[col * n + c];
        const xi = T.im[col * n + c];
        T.re[col * n + c] = (xr * dr + xi * di) / dd;
        T.im[col * n + c] = (xi * dr - xr * di) / dd;
      }
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const fr = A.re[r * n + col];
      const fi = A.im[r * n + col];
      if (fr === 0 && fi === 0) continue;
      for (let c = 0; c < n; c++) {
        for (const T of [A, X]) {
          const pr2 = fr * T.re[col * n + c] - fi * T.im[col * n + c];
          const pi2 = fr * T.im[col * n + c] + fi * T.re[col * n + c];
          T.re[r * n + c] -= pr2;
          T.im[r * n + c] -= pi2;
        }
      }
    }
  }
  return X;
}

/**
 * Eigenvalues of a small complex n×n matrix (n ≤ 4).
 * n = 1 trivial, n = 2 in closed form through the quadratic, beyond that by
 * power iteration on the roots of the characteristic polynomial obtained by
 * Leverrier — the size is that of the number of sources in a lecture, not that
 * of a general solver.
 */
export function eigComplexSmall(mr, mi, n) {
  if (n === 1) return { re: Float64Array.from([mr[0]]), im: Float64Array.from([mi[0]]) };
  if (n === 2) {
    // λ² − tr·λ + det = 0
    const tr = [mr[0] + mr[3], mi[0] + mi[3]];
    const det = [
      mr[0] * mr[3] - mi[0] * mi[3] - (mr[1] * mr[2] - mi[1] * mi[2]),
      mr[0] * mi[3] + mi[0] * mr[3] - (mr[1] * mi[2] + mi[1] * mr[2]),
    ];
    const dr = tr[0] * tr[0] - tr[1] * tr[1] - 4 * det[0];
    const di = 2 * tr[0] * tr[1] - 4 * det[1];
    const mod = Math.hypot(dr, di);
    const sr = Math.sqrt(Math.max((mod + dr) / 2, 0));
    const si = Math.sign(di || 1) * Math.sqrt(Math.max((mod - dr) / 2, 0));
    return {
      re: Float64Array.from([(tr[0] + sr) / 2, (tr[0] - sr) / 2]),
      im: Float64Array.from([(tr[1] + si) / 2, (tr[1] - si) / 2]),
    };
  }
  // n ≥ 3: characteristic polynomial by Faddeev–LeVerrier, then its roots
  const I = (k) => k;
  const size = n * n;
  let Mr = Float64Array.from(mr);
  let Mi = Float64Array.from(mi);
  const cr = new Float64Array(n + 1);
  const ci = new Float64Array(n + 1);
  cr[0] = 1;
  let Ar = new Float64Array(size);
  let Ai = new Float64Array(size);
  for (let k = 1; k <= n; k++) {
    if (k === 1) {
      Ar = Float64Array.from(mr);
      Ai = Float64Array.from(mi);
    } else {
      const Nr = new Float64Array(size);
      const Ni = new Float64Array(size);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          let sr = 0;
          let si = 0;
          for (let l = 0; l < n; l++) {
            const xr = Mr[i * n + l];
            const xi = Mi[i * n + l];
            const yr = Ar[l * n + j];
            const yi = Ai[l * n + j];
            sr += xr * yr - xi * yi;
            si += xr * yi + xi * yr;
          }
          Nr[i * n + j] = sr;
          Ni[i * n + j] = si;
        }
      Ar = Nr;
      Ai = Ni;
    }
    let trr = 0;
    let tri = 0;
    for (let i = 0; i < n; i++) {
      trr += Ar[i * n + i];
      tri += Ai[i * n + i];
    }
    cr[I(k)] = -trr / k;
    ci[I(k)] = -tri / k;
    for (let i = 0; i < n; i++) {
      Ar[i * n + i] += cr[I(k)];
      Ai[i * n + i] += ci[I(k)];
    }
  }
  return polyRootsComplex(cr, ci);
}

/**
 * Complex amplitudes in the LEAST-SQUARES sense, at the given frequencies.
 *
 * Once the frequencies are known the model becomes LINEAR in its amplitudes:
 * x ≈ V a, with V[n][k] = e^{j2πf_k n}. The normal equations (VᴴV) a = Vᴴx form
 * a d × d system — d being the number of sources, two or three in a lecture —
 * so the complex Gaussian elimination already written for ESPRIT is enough,
 * with nothing new.
 *
 * This is what closes the loop: subspace methods return FREQUENCIES and nothing
 * else. Without this step one knows where the lines are and not what they are
 * worth, and can therefore neither reconstruct the signal nor say whether the
 * model explains the measurement.
 *
 * The residual power ‖x − Va‖²/N comes with it: that is the noise-variance
 * estimate implied by the model, independent of the one the eigenvalue plateau
 * gives. The two must agree, and the harness verifies it — two paths that
 * concur are worth more than one path taken on trust.
 *
 * @param {Float64Array} xr, xi  the complex record
 * @param {Float64Array} freqs   fréquences normalisées (cycles/échantillon)
 * @returns {{re: Float64Array, im: Float64Array, power: Float64Array,
 *            noise: number, residual: number}}
 */
export function lsAmplitudes(xr, xi, freqs) {
  const N = xr.length;
  const d = freqs.length;
  if (d === 0) return { re: new Float64Array(0), im: new Float64Array(0), power: new Float64Array(0), noise: NaN, residual: NaN };

  // VᴴV (d×d) et Vᴴx (d), formés sans jamais matérialiser V (N×d)
  const Ar = new Float64Array(d * d);
  const Ai = new Float64Array(d * d);
  const br = new Float64Array(d * d); // colonne 0 = Vᴴx, le reste à zéro
  const bi = new Float64Array(d * d);
  for (let p = 0; p < d; p++) {
    for (let q = 0; q < d; q++) {
      let sr = 0;
      let si = 0;
      const dw = 2 * Math.PI * (freqs[q] - freqs[p]);
      for (let n = 0; n < N; n++) {
        sr += Math.cos(dw * n);
        si += Math.sin(dw * n);
      }
      Ar[p * d + q] = sr;
      Ai[p * d + q] = si;
    }
    let sr = 0;
    let si = 0;
    const w = 2 * Math.PI * freqs[p];
    for (let n = 0; n < N; n++) {
      const c = Math.cos(w * n);
      const s = Math.sin(w * n);
      // conj(e^{jwn}) · x[n]
      sr += c * xr[n] + s * xi[n];
      si += c * xi[n] - s * xr[n];
    }
    br[p * d] = sr;
    bi[p * d] = si;
  }
  const sol = solveComplex(Ar, Ai, br, bi, d);
  const ar = new Float64Array(d);
  const ai = new Float64Array(d);
  const power = new Float64Array(d);
  for (let k = 0; k < d; k++) {
    ar[k] = sol.re[k * d];
    ai[k] = sol.im[k * d];
    power[k] = ar[k] * ar[k] + ai[k] * ai[k];
  }

  // residual: what the model does not explain
  let res = 0;
  for (let n = 0; n < N; n++) {
    let mr = 0;
    let mi = 0;
    for (let k = 0; k < d; k++) {
      const w = 2 * Math.PI * freqs[k] * n;
      const c = Math.cos(w);
      const s = Math.sin(w);
      mr += ar[k] * c - ai[k] * s;
      mi += ar[k] * s + ai[k] * c;
    }
    const er = xr[n] - mr;
    const ei = xi[n] - mi;
    res += er * er + ei * ei;
  }
  return { re: ar, im: ai, power, noise: res / N, residual: res };
}
