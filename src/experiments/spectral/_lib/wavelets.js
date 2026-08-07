// THE DISCRETE WAVELET TRANSFORM — periodized, orthogonal, two filters. The
// subject's _lib holds it because the transform is the science and the
// experiment is the staging: compute.js and check.js both consume this, and
// the harness proves on it the four identities the lecture stands on
// (perfect reconstruction, Parseval, vanishing moments, pair sparsity).
//
// Implementation: the classic pyramid. One analysis step splits x (length n)
// into an approximation a and a detail d (length n/2 each) by circular
// convolution with the scaling filter h and the wavelet filter g, decimated
// by two; J steps repeat on the approximation. Periodization is the honest
// boundary rule here — it keeps the transform exactly orthogonal, and its
// price is the same one the DFT charges: a signal that does not close on the
// window carries a wrap discontinuity, and the wavelets near it pay for it.
//
// PURE: no DOM, no state. Importable from compute.js and check.js.

const SQRT2 = Math.SQRT2;
const S3 = Math.sqrt(3);

/** The two orthogonal filters the catalogue teaches with. */
export const WAVELETS = {
  // Haar — support 2, one vanishing moment: kills constants, keeps every jump
  haar: [1 / SQRT2, 1 / SQRT2],
  // Daubechies-4 — support 4, TWO vanishing moments: kills straight lines
  db4: [(1 + S3) / (4 * SQRT2), (3 + S3) / (4 * SQRT2), (3 - S3) / (4 * SQRT2), (1 - S3) / (4 * SQRT2)],
};

/** Wavelet filter from the scaling filter: g[n] = (−1)ⁿ h[L−1−n]. */
function highpass(h) {
  const L = h.length;
  const g = new Float64Array(L);
  for (let n = 0; n < L; n++) g[n] = (n % 2 ? -1 : 1) * h[L - 1 - n];
  return g;
}

/** One analysis step: x (length n, even) → {a, d} (length n/2 each). */
function step(x, h, g) {
  const n = x.length;
  const half = n / 2;
  const L = h.length;
  const a = new Float64Array(half);
  const d = new Float64Array(half);
  for (let k = 0; k < half; k++) {
    let sa = 0;
    let sd = 0;
    for (let m = 0; m < L; m++) {
      const v = x[(2 * k + m) % n];
      sa += h[m] * v;
      sd += g[m] * v;
    }
    a[k] = sa;
    d[k] = sd;
  }
  return { a, d };
}

/** One synthesis step, the exact adjoint: {a, d} → x (length 2·|a|). */
function unstep(a, d, h, g) {
  const half = a.length;
  const n = 2 * half;
  const L = h.length;
  const x = new Float64Array(n);
  for (let k = 0; k < half; k++) {
    for (let m = 0; m < L; m++) {
      x[(2 * k + m) % n] += h[m] * a[k] + g[m] * d[k];
    }
  }
  return x;
}

/**
 * The pyramid: J levels of analysis.
 * @param {Float64Array} x  length divisible by 2^J
 * @param {number} J
 * @param {string} wavelet  'haar' | 'db4'
 * @returns {{approx: Float64Array, details: Float64Array[]}}
 *   details[j] is level j+1 (finest first, length n/2^(j+1))
 */
export function dwt(x, J, wavelet) {
  const h = WAVELETS[wavelet];
  const g = highpass(h);
  const details = [];
  let a = Float64Array.from(x);
  for (let j = 0; j < J; j++) {
    const s = step(a, h, g);
    details.push(s.d);
    a = s.a;
  }
  return { approx: a, details };
}

/** The inverse pyramid — exact, because the filters are orthogonal. */
export function idwt(approx, details, wavelet) {
  const h = WAVELETS[wavelet];
  const g = highpass(h);
  let a = Float64Array.from(approx);
  for (let j = details.length - 1; j >= 0; j--) a = unstep(a, details[j], h, g);
  return a;
}
