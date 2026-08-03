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
// Two systems, chosen because their frequency behaviour is the whole first
// year of the subject:
//   premier ordre  H = K/(1 + jωτ)        — Nyquist is EXACTLY a half-circle
//   second ordre   H = Kω₀²/(ω₀²−ω² + 2jmω₀ω)
// The second order resonates iff m < 1/√2 ≈ 0.707: below that the Bode gain
// bulges, the Nyquist loop swells past the real axis and the Black curve
// grows a nose. Above, all three are tame. That threshold is the reason the
// scenes sit at m = 1.2 and m = 0.3.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { toDb } from '../../../core/numeric.js';

const NW = 361; // log grid: 6 decades around the natural pulsation
const DECADES = 3; // ±3 decades

/** H(jω) as [Re, Im] — closed form, no integration anywhere. */
export function transfer(sys, w, { K, tau, w0, m }) {
  if (sys === 'first') {
    const d = 1 + (w * tau) ** 2;
    return [K / d, (-K * w * tau) / d];
  }
  const re = w0 * w0 - w * w;
  const im = 2 * m * w0 * w;
  const d = re * re + im * im;
  const n = K * w0 * w0;
  return [(n * re) / d, (-n * im) / d];
}

/** The pulsation the diagrams are centred on: 1/τ or ω₀. */
export const naturalW = (sys, { tau, w0 }) => (sys === 'first' ? 1 / tau : w0);

/**
 * @param {{sys: string, K: number, tau: number, w0: number, m: number,
 *          wc: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute(params) {
  const { sys, K, m, wc } = params;
  const wn = naturalW(sys, params);

  const w = new Float64Array(NW);
  const gainDb = new Float64Array(NW);
  const phaseDeg = new Float64Array(NW);
  const reArr = new Float64Array(NW);
  const imArr = new Float64Array(NW);
  let maxDb = -Infinity;
  let wPeak = NaN;
  for (let i = 0; i < NW; i++) {
    const wi = wn * 10 ** (-DECADES + (2 * DECADES * i) / (NW - 1));
    const [re, im] = transfer(sys, wi, params);
    w[i] = wi;
    reArr[i] = re;
    imArr[i] = im;
    gainDb[i] = toDb(Math.hypot(re, im));
    phaseDeg[i] = (Math.atan2(im, re) * 180) / Math.PI;
    if (gainDb[i] > maxDb) {
      maxDb = gainDb[i];
      wPeak = wi;
    }
  }

  /* ---------- the cursor: one point, marked on all four views ------------- */
  const [cre, cim] = transfer(sys, wc, params);
  const cGainDb = toDb(Math.hypot(cre, cim));
  const cPhase = (Math.atan2(cim, cre) * 180) / Math.PI;

  // resonance, exact: only below m = 1/√2, and then at ω₀√(1−2m²)
  const resonant = sys === 'second' && m < Math.SQRT1_2 - 1e-9;
  const wr = resonant ? params.w0 * Math.sqrt(1 - 2 * m * m) : NaN;
  const mrDb = resonant ? toDb(K / (2 * m * Math.sqrt(1 - m * m))) : NaN;

  return {
    observables: {
      gain: { x: w, y: gainDb },
      phase: { x: w, y: phaseDeg },
      // Nyquist: the locus in the complex plane, plus the cursor and −1
      locus: { x: reArr, y: imArr },
      cursorPt: { x: Float64Array.from([cre]), y: Float64Array.from([cim]) },
      critical: { x: Float64Array.from([-1]), y: Float64Array.from([0]) },
      // Black (Nichols): the same locus, gain against phase
      black: { x: phaseDeg, y: gainDb },
      cursorBlack: { x: Float64Array.from([cPhase]), y: Float64Array.from([cGainDb]) },
      criticalBlack: { x: Float64Array.from([-180]), y: Float64Array.from([0]) },
      wr, // vline on the Bode gain when the system resonates
      cGainDb: {
        value: cGainDb,
        meta: { label: '|H(jω_c)|', unit: 'dB', precision: 2 },
      },
      cPhase: {
        value: cPhase,
        meta: { label: 'arg H(jω_c)', unit: '°', precision: 1 },
      },
      cMod: { value: Math.hypot(cre, cim), meta: { label: '|H(jω_c)| linéaire', precision: 4 } },
      mrDb: { value: mrDb, meta: { label: 'résonance M_r', unit: 'dB', precision: 2 } },
      wrOut: { value: wr, meta: { label: 'ω_r', unit: 'rad/s', precision: 2 } },
    },
  };
}
