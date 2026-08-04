// Bode, Nyquist and Black — the SAME complex number H(jω), drawn three ways.
// Nothing is estimated: H is evaluated in closed form on a log grid, and each
// representation is a different projection of that one locus:
//   Bode     |H| in dB and arg H, both against ω (log)
//   Nyquist  Im H against Re H, ω sliding along the curve
//   Black    |H| in dB against arg H, ω sliding again
// A single cursor pulsation ωc is marked on all four views, so the same pair
// (gain, phase) can be read four times in four places — which is the only way
// the link between the diagrams becomes obvious rather than asserted.
//
// Three systems, chosen because their frequency behaviour is the whole first
// year of the subject:
//   first order    H = K/(1 + jωτ)        — Nyquist is EXACTLY a half-circle
//   second order   H = Kω₀²/(ω₀²−ω² + 2jmω₀ω)
//   open loop      H = K/(jω(1+jωτ₁)(1+jωτ₂)),  τ₂ = τ₁/5
// The second order resonates iff m < 1/√2 ≈ 0.707: below that the Bode gain
// bulges, the Nyquist loop swells past the real axis and the Black curve
// grows a nose. Above, all three are tame. That threshold is the reason the
// scenes sit at m = 1.2 and m = 0.3.
//
// The open loop is the one that gives the −1 point a job. Its phase reaches
// −180° at a FINITE pulsation, so both margins exist and both are closed
// form — which is why they are asserted rather than measured:
//   ω₁₈₀ = 1/√(τ₁τ₂)            (arctan τ₁ω + arctan τ₂ω = 90°)
//   |H(jω₁₈₀)| = K·τ₁τ₂/(τ₁+τ₂)  (the algebra collapses exactly)
//   ⇒ marge de gain = 1/|H(jω₁₈₀)|, and the closed loop turns unstable at
//     K_crit = (τ₁+τ₂)/(τ₁τ₂) = 6/τ₁ — a number the drawer prints, and a
//     slider the lecture can cross.
// The phase margin needs the gain crossover, which has no closed form: it is
// bisected on |H| (60 halvings, so the bracket is machine-tight).
//
// One subtlety the diagrams live or die by: the open loop's phase runs from
// −90° to −270°, so atan2's principal value would FOLD it back at −180° —
// a jump that exists nowhere in the system and would put the margin on the
// wrong side. Every phase here comes from a continuous closed form instead,
// which is also what a Bode plot is expected to show.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { toDb } from '../../../core/numeric.js';

const NW = 361;
const DECADES = 3; // fixed-order systems: ±3 decades around the natural pulsation

// The open loop has no natural pulsation to centre on and no bounded gain: at
// ω → 0 its modulus runs to infinity. It is framed by GAIN instead — from
// +30 dB down to −40 dB — which is how an open-loop Bode plot is drawn in
// practice and which keeps 0 dB and −180° comfortably inside the picture.
const GAIN_TOP = 30;
const GAIN_BOTTOM = -40;

// Nyquist of a type-1 system runs off to infinity along an asymptote; drawing
// it whole would push the −1 point into a corner. The locus is cut at |H| = 3,
// so the window is always the disc where the margins are actually read.
const NY_MAX = 3;

/** The open loop's second pole is five times faster than the dominant one. */
export const TAU_RATIO = 5;

/** H(jω) as [Re, Im] — closed form, no integration anywhere. */
export function transfer(sys, w, { K, tau, w0, m }) {
  if (sys === 'first') {
    const d = 1 + (w * tau) ** 2;
    return [K / d, (-K * w * tau) / d];
  }
  if (sys === 'openloop') {
    // K / (jω(1+jωτ₁)(1+jωτ₂)) — expand the denominator, then divide
    const t1 = tau;
    const t2 = tau / TAU_RATIO;
    const re = -w * w * (t1 + t2); // Re of jω(1+jωτ₁)(1+jωτ₂)
    const im = w * (1 - w * w * t1 * t2);
    const d = re * re + im * im;
    return [(K * re) / d, (-K * im) / d];
  }
  const re = w0 * w0 - w * w;
  const im = 2 * m * w0 * w;
  const d = re * re + im * im;
  const n = K * w0 * w0;
  return [(n * re) / d, (-n * im) / d];
}

/** Continuous phase in degrees — never atan2, which would fold at −180°. */
export function phaseOf(sys, w, { tau, w0, m }) {
  const deg = 180 / Math.PI;
  if (sys === 'first') return -Math.atan(w * tau) * deg;
  if (sys === 'openloop')
    return -90 - Math.atan(w * tau) * deg - Math.atan((w * tau) / TAU_RATIO) * deg;
  return -Math.atan2(2 * m * w0 * w, w0 * w0 - w * w) * deg;
}

/** The pulsation the fixed-order diagrams are centred on: 1/τ or ω₀. */
export const naturalW = (sys, { tau, w0 }) => (sys === 'first' ? 1 / tau : w0);

/** Where the open loop's phase hits −180°, in closed form. */
export const w180Of = (tau) => Math.sqrt(TAU_RATIO) / tau; // = 1/√(τ₁τ₂)

/** |H(jω₁₈₀)| = K·τ₁τ₂/(τ₁+τ₂) — the algebra collapses exactly. */
export const modAt180 = (K, tau) => (K * tau) / (TAU_RATIO + 1);

/**
 * The pulsation where |H| reaches `target`, by bisection — the open loop's
 * modulus is strictly decreasing, so the bracket is unambiguous. 60 geometric
 * halvings of a 12-decade bracket leave the answer machine-tight. Used for the
 * gain crossover (target = 1) and for the two ends of the plotted grid.
 */
export function omegaAtMod(sys, params, target) {
  const mod = (w) => Math.hypot(...transfer(sys, w, params));
  let lo = 1e-6;
  let hi = 1e6;
  if (mod(lo) < target || mod(hi) > target) return NaN; // never crosses in reach
  for (let i = 0; i < 60; i++) {
    const mid = Math.sqrt(lo * hi);
    if (mod(mid) > target) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

const crossover = (sys, params) => omegaAtMod(sys, params, 1);

/**
 * @param {{sys: string, K: number, tau: number, w0: number, m: number,
 *          wc: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute(params) {
  const { sys, K, m, wc } = params;
  const open = sys === 'openloop';

  // grid ends: decades around ω_n for a fixed order, gain-bracketed for the
  // open loop (whose modulus is unbounded at ω → 0)
  const wLo = open
    ? omegaAtMod(sys, params, 10 ** (GAIN_TOP / 20))
    : naturalW(sys, params) * 10 ** -DECADES;
  const wHi = open
    ? omegaAtMod(sys, params, 10 ** (GAIN_BOTTOM / 20))
    : naturalW(sys, params) * 10 ** DECADES;
  const ratio = wHi / wLo;

  const w = new Float64Array(NW);
  const gainDb = new Float64Array(NW);
  const phaseDeg = new Float64Array(NW);
  const reArr = new Float64Array(NW);
  const imArr = new Float64Array(NW);
  let maxDb = -Infinity;
  let wPeak = NaN;
  for (let i = 0; i < NW; i++) {
    const wi = wLo * ratio ** (i / (NW - 1));
    const [re, im] = transfer(sys, wi, params);
    const mod = Math.hypot(re, im);
    w[i] = wi;
    // the Nyquist locus is cut where it leaves the reading disc; NaN lifts the
    // pen and is ignored by the window, so the −1 point keeps its place
    const shown = !open || mod <= NY_MAX;
    reArr[i] = shown ? re : NaN;
    imArr[i] = shown ? im : NaN;
    gainDb[i] = toDb(mod);
    phaseDeg[i] = phaseOf(sys, wi, params);
    if (gainDb[i] > maxDb) {
      maxDb = gainDb[i];
      wPeak = wi;
    }
  }

  /* ---------- the cursor: one point, marked on all four views ------------- */
  const [cre, cim] = transfer(sys, wc, params);
  const cMod = Math.hypot(cre, cim);
  const cGainDb = toDb(cMod);
  const cPhase = phaseOf(sys, wc, params);
  // outside the reading disc the cursor is dropped from Nyquist only — it
  // would otherwise drag the equal-aspect window with it. The three other
  // views keep showing it.
  const cShown = !open || cMod <= NY_MAX;

  // resonance, exact: only below m = 1/√2, and then at ω₀√(1−2m²)
  const resonant = sys === 'second' && m < Math.SQRT1_2 - 1e-9;
  const wr = resonant ? params.w0 * Math.sqrt(1 - 2 * m * m) : NaN;
  const mrDb = resonant ? toDb(K / (2 * m * Math.sqrt(1 - m * m))) : NaN;

  /* ---------- margins: the reason the −1 point is drawn at all ------------ */
  const w180 = open ? w180Of(params.tau) : NaN;
  const gainMargin = open ? -toDb(modAt180(K, params.tau)) : NaN;
  const wco = open ? crossover(sys, params) : NaN;
  let phaseMargin = NaN;
  if (open && Number.isFinite(wco)) phaseMargin = 180 + phaseOf(sys, wco, params);
  const kCrit = open ? (TAU_RATIO + 1) / params.tau : NaN;


  return {
    observables: {
      gain: { x: w, y: gainDb },
      phase: { x: w, y: phaseDeg },
      // Nyquist: the locus in the complex plane, plus the cursor and −1
      locus: { x: reArr, y: imArr },
      cursorPt: {
        x: Float64Array.from([cShown ? cre : NaN]),
        y: Float64Array.from([cShown ? cim : NaN]),
      },
      critical: { x: Float64Array.from([-1]), y: Float64Array.from([0]) },
      // Black (Nichols): the same locus, gain against phase
      black: { x: phaseDeg, y: gainDb },
      cursorBlack: { x: Float64Array.from([cPhase]), y: Float64Array.from([cGainDb]) },
      criticalBlack: { x: Float64Array.from([-180]), y: Float64Array.from([0]) },
      wr, // vline on the Bode gain when the system resonates
      wco, // vlines: the two crossovers of the open loop
      w180,
      cGainDb: {
        value: cGainDb,
        meta: { label: '|H(jω_c)|', unit: 'dB', precision: 2 },
      },
      cPhase: {
        value: cPhase,
        meta: { label: 'arg H(jω_c)', unit: '°', precision: 1 },
      },
      cMod: { value: cMod, meta: { label: '|H(jω_c)| linear', precision: 4 } },
      mrDb: { value: mrDb, meta: { label: 'resonance M_r', unit: 'dB', precision: 2 } },
      wrOut: { value: wr, meta: { label: 'ω_r', unit: 'rad/s', precision: 2 } },
      phaseMargin: {
        value: phaseMargin,
        meta: { label: 'phase margin', unit: '°', precision: 1 },
      },
      gainMargin: {
        value: gainMargin,
        meta: { label: 'gain margin', unit: 'dB', precision: 1 },
      },
      wcoOut: { value: wco, meta: { label: 'ω at 0 dB', unit: 'rad/s', precision: 2 } },
      w180Out: { value: w180, meta: { label: 'ω at −180°', unit: 'rad/s', precision: 2 } },
      kCrit: { value: kCrit, meta: { label: 'K critique', precision: 2 } },
    },
  };
}
