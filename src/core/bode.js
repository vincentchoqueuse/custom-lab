// The frequency sweep every LTI experiment needs, computed once.
//
// A Bode plot is the same two curves whatever produced the system: |H| in dB
// and arg H in degrees, on a logarithmic pulsation grid. What differs between
// experiments is only how H(jω) is evaluated — a closed form for a first
// order, a polynomial ratio for a typed-in transfer function, a product for a
// controller times a plant. So that is the ONE argument: a function
// `w => [Re, Im]`. Everything else is shared, including the two things that
// are easy to get subtly wrong:
//
//  1. PHASE CONTINUITY. atan2 returns a principal value in (−180°, 180°], so
//     any system whose phase passes −180° (two poles and a delay, a type-1
//     open loop, a fourth-order plant) shows a jump that exists nowhere in
//     the system — and puts any margin read from the plot on the wrong side.
//     The sweep unwraps: a jump larger than half a turn between two adjacent
//     grid points is a wrap, not a phase change, and is removed.
//
//  2. WHERE TO CENTRE THE GRID. A Bode plot framed on the wrong decades shows
//     a straight line and teaches nothing. `naturalPulsation` reads the
//     characteristic pulsation off the denominator coefficients in closed
//     form: for a monic-normalised polynomial the product of the pole moduli
//     is |a_n/a_0|, so their geometric mean is |a_n/a_0|^(1/n). It gives 1/τ
//     for (τs+1), ω₀ for (s²+2mω₀s+ω₀²), and something sensible for anything
//     else — with the poles at the origin of an integrator stripped first,
//     since those carry no scale.
//
// PURE: no DOM, no state. Importable from compute.js and from check.js.
import { toDb, polyEvalComplex } from './numeric.js';

export const NW = 361; // grid points — 60 per decade over the default span
export const DECADES = 3;

/**
 * Sweep H over a log grid centred on `center`.
 * @param {(w: number) => [number, number]} H  jω ↦ [Re, Im]
 * @param {{center?: number, decades?: number, n?: number,
 *          lo?: number, hi?: number}} opts
 *   center/decades frame the grid; lo/hi override both when an experiment
 *   knows its own bounds (a gain-bracketed open loop, a measured band).
 * @returns {{w: Float64Array, gainDb: Float64Array, phaseDeg: Float64Array,
 *            re: Float64Array, im: Float64Array}}
 */
export function bodeSweep(H, { center = 1, decades = DECADES, n = NW, lo, hi } = {}) {
  // Centred form when the grid is described by decades: `center` then lands
  // on the middle point EXACTLY, which is what the experiments read their
  // cut-off values at. Only the lo/hi form needs the ratio.
  const centred = lo == null && hi == null;
  const wLo = lo ?? center * 10 ** -decades;
  const wHi = hi ?? center * 10 ** decades;
  const ratio = wHi / wLo;
  const at = (i) =>
    centred ? center * 10 ** (-decades + (2 * decades * i) / (n - 1)) : wLo * ratio ** (i / (n - 1));
  const w = new Float64Array(n);
  const gainDb = new Float64Array(n);
  const phaseDeg = new Float64Array(n);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  let turns = 0; // accumulated wraps, in degrees
  let prev = NaN;
  for (let i = 0; i < n; i++) {
    const wi = at(i);
    const [r, m] = H(wi);
    w[i] = wi;
    re[i] = r;
    im[i] = m;
    gainDb[i] = toDb(Math.hypot(r, m));
    const raw = (Math.atan2(m, r) * 180) / Math.PI;
    if (Number.isFinite(prev)) {
      const jump = raw - prev;
      if (jump > 180) turns -= 360;
      else if (jump < -180) turns += 360;
    }
    prev = raw;
    phaseDeg[i] = raw + turns;
  }
  return { w, gainDb, phaseDeg, re, im };
}

/**
 * The characteristic pulsation of a polynomial given in DESCENDING powers:
 * the geometric mean of its root moduli, in closed form from the
 * coefficients. Poles at the origin (trailing zeros) are stripped first —
 * an integrator has no scale of its own. Returns NaN for a constant.
 */
export function naturalPulsation(den) {
  let last = den.length - 1;
  while (last > 0 && den[last] === 0) last--; // strip the origin roots
  let first = 0;
  while (first < last && den[first] === 0) first++;
  const n = last - first;
  if (n <= 0) return NaN;
  const ratio = Math.abs(den[last] / den[first]);
  return ratio > 0 ? ratio ** (1 / n) : NaN;
}

/** H(jω) = num(jω)/den(jω), coefficients in descending powers. */
export function polyTransfer(num, den) {
  return (w) => {
    const [nr, ni] = polyEvalComplex(num, 0, w);
    const [dr, di] = polyEvalComplex(den, 0, w);
    const d = dr * dr + di * di;
    return [(nr * dr + ni * di) / d, (ni * dr - nr * di) / d];
  };
}

/**
 * The two observables a Bode pair is made of, named the same everywhere so
 * the shared gainView/phaseView find them without configuration.
 * `extra` merges anything the experiment wants alongside (a measured point,
 * a second curve).
 */
export function bodeObservables(sweep) {
  return {
    gain: { x: sweep.w, y: sweep.gainDb },
    phase: { x: sweep.w, y: sweep.phaseDeg },
  };
}
