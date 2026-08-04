// The closed-form time responses of the canonical systems — the TIME half of
// what _lib/bode.js does in frequency.
//
// They used to live in `control/second-order/compute.js`, and three other
// experiments had ended up importing that file: one experiment had become
// another's library, and the second order could no longer be touched without
// risking two breakages. An experiment reads on its own; what it shares moves
// up here.
//
// All these functions are CLOSED FORMS, never a numerical integration: that is
// what lets the harnesses compare a response computed some other way (closing a
// loop, changing basis) against an exact reference, with no integration scheme
// to blame if they disagree.
//
// PURE: no DOM, no state. Importable from compute.js and check.js.

import { polyEvalComplex } from '../../../core/numeric.js';

const EPS = 1e-6; // the width of the band treated as critical (m = 1)

/**
 * Step response of K·ω₀²/(s² + 2mω₀s + ω₀²), exact in all three regimes:
 *   m < 1  y = K(1 − e^{−mω₀t}(cos ω_d t + m/√(1−m²)·sin ω_d t)), ω_d = ω₀√(1−m²)
 *   m = 1  y = K(1 − (1 + ω₀t)e^{−ω₀t})
 *   m > 1  two real poles −ω₀(m ∓ √(m²−1)), a sum of two exponentials
 */
export function secondOrderStep(K, m, w0, t) {
  if (Math.abs(m - 1) < EPS) return K * (1 - (1 + w0 * t) * Math.exp(-w0 * t));
  if (m < 1) {
    const wd = w0 * Math.sqrt(1 - m * m);
    const e = Math.exp(-m * w0 * t);
    return K * (1 - e * (Math.cos(wd * t) + (m / Math.sqrt(1 - m * m)) * Math.sin(wd * t)));
  }
  const s = Math.sqrt(m * m - 1);
  const r1 = -w0 * (m - s);
  const r2 = -w0 * (m + s);
  return K * (1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1));
}

/**
 * Impulse response of the same system — it is the derivative of the previous
 * one, and the harnesses verify it:
 *   m < 1  h = Kω₀²/ω_d · e^{−mω₀t}·sin(ω_d t)
 *   m = 1  h = Kω₀²·t·e^{−ω₀t}
 *   m > 1  h = Kω₀²(e^{r₁t} − e^{r₂t})/(r₁ − r₂)
 */
export function secondOrderImpulse(K, m, w0, t) {
  if (Math.abs(m - 1) < EPS) return K * w0 * w0 * t * Math.exp(-w0 * t);
  if (m < 1) {
    const wd = w0 * Math.sqrt(1 - m * m);
    return ((K * w0 * w0) / wd) * Math.exp(-m * w0 * t) * Math.sin(wd * t);
  }
  const s = Math.sqrt(m * m - 1);
  const r1 = -w0 * (m - s);
  const r2 = -w0 * (m + s);
  return (K * w0 * w0 * (Math.exp(r1 * t) - Math.exp(r2 * t))) / (r1 - r2);
}

/** Les deux pôles de ce même second ordre, comme [[Re, Im], [Re, Im]]. */
export function secondOrderPoles(m, w0) {
  if (m < 1) {
    const wd = w0 * Math.sqrt(1 - m * m);
    return [
      [-m * w0, wd],
      [-m * w0, -wd],
    ];
  }
  const s = w0 * Math.sqrt(m * m - 1);
  return [
    [-m * w0 + s, 0],
    [-m * w0 - s, 0],
  ];
}

/**
 * Step response of the first order K(1 + τ_z s)/(1 + τs):
 *   y(t) = K[1 − (1 − τ_z/τ)·e^{−t/τ}]
 * τ_z = 0 gives the pure exponential; τ_z < 0 the non-minimum phase.
 */
export function firstOrderStep(K, tau, tz, t) {
  return K * (1 - (1 - tz / tau) * Math.exp(-t / tau));
}

/** Continuous part of the first-order h(t) (the Dirac K·τ_z/τ is separate). */
export function firstOrderImpulse(K, tau, tz, t) {
  return ((K * (1 - tz / tau)) / tau) * Math.exp(-t / tau);
}

/* ------------------------------------------------------------------------ */
/* Roots of a polynomial — the poles and zeros of an ARBITRARY system        */
/* ------------------------------------------------------------------------ */

/**
 * Complex roots of a polynomial with real coefficients given in DECREASING
 * powers, by the Durand–Kerner (Weierstrass) iteration:
 *
 *   z_k ← z_k − p(z_k) / Π_{j≠k} (z_k − z_j)
 *
 * This is Newton's method applied simultaneously to the n roots, with the
 * denominator playing the part of the deflated derivative. It fits in thirty
 * lines, needs no linear algebra at all (no companion matrix, no QR) and
 * converges quadratically on simple roots — far enough for the orders 1 to 6
 * typed in a lecture.
 *
 * Two precautions that are not cosmetic:
 *
 *  - the ZERO roots are peeled off by hand (trailing zeros). On a multiple root
 *    the convergence drops to first order and the accuracy floors at ε^{1/m}; a
 *    double integrator, with s² as a factor, would give two points 1e-8 from
 *    the origin instead of one clean double pole. Here they are exact by
 *    construction.
 *  - the starting points are FIXED (a spiral of Cauchy radius), never drawn at
 *    random: the computation must be deterministic at equal parameters, which
 *    is the project contract.
 *
 * @param {number[]} coeffs decreasing powers, coeffs[0] = highest-degree term
 * @returns {number[][]} [[Re, Im], …], of length deg(p)
 */
export function polyRoots(coeffs) {
  const c = Array.from(coeffs, Number);
  while (c.length > 1 && c[0] === 0) c.shift(); // un zéro de tête n'est pas un degré
  const out = [];
  while (c.length > 1 && c[c.length - 1] === 0) {
    c.pop();
    out.push([0, 0]); // racine à l'origine, exacte
  }
  const n = c.length - 1;
  if (n <= 0) return out;

  const a = c.map((v) => v / c[0]); // monic
  // Cauchy bound: every root lies in |z| ≤ 1 + max|a_i|
  let R = 1;
  for (let i = 1; i <= n; i++) R = Math.max(R, Math.abs(a[i]));
  R = 1 + R;

  const zr = new Float64Array(n);
  const zi = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const th = (2 * Math.PI * k) / n + 0.4; // 0.4 rad: never on the real axis
    zr[k] = 0.6 * R * Math.cos(th);
    zi[k] = 0.6 * R * Math.sin(th);
  }

  for (let it = 0; it < 500; it++) {
    let move = 0;
    for (let k = 0; k < n; k++) {
      const [pr, pi] = polyEvalComplex(a, zr[k], zi[k]);
      let dr = 1;
      let di = 0;
      for (let j = 0; j < n; j++) {
        if (j === k) continue;
        const er = zr[k] - zr[j];
        const ei = zi[k] - zi[j];
        const t = dr * er - di * ei;
        di = dr * ei + di * er;
        dr = t;
      }
      const m = dr * dr + di * di;
      if (!(m > 1e-300)) continue; // two iterates coincide: skip this round
      const qr = (pr * dr + pi * di) / m;
      const qi = (pi * dr - pr * di) / m;
      zr[k] -= qr;
      zi[k] -= qi;
      move = Math.max(move, Math.hypot(qr, qi));
    }
    if (move < 1e-14) break;
  }

  // A real polynomial has roots that are real or conjugate in pairs; a multiple
  // real root leaves the iteration with a residual imaginary part (the ε^{1/m}
  // floor above). Setting it back to zero tells the truth — a double pole at −1
  // is real — instead of drawing two points lifted off the axis.
  for (let k = 0; k < n; k++) {
    const scale = Math.max(1, Math.abs(zr[k]));
    out.push([zr[k], Math.abs(zi[k]) < 1e-6 * scale ? 0 : zi[k]]);
  }
  return out;
}
