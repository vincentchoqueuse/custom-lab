// The catalogue of canonical analog signals and their Fourier transforms —
// the table every course prints, made movable. Seven pairs, each in CLOSED
// FORM (nothing here is estimated by an FFT; the numerical Fourier integral
// lives in check.js, where it belongs):
//
//   porte          Π(t/T)                 T·sinc(fT)
//   triangle       Λ(t/T)                 T·sinc²(fT)
//   gaussienne     e^{−π(t/T)²}           T·e^{−π(fT)²}          ← point fixe
//   exp. causale   e^{−t/T}·u(t)          T/(1 + j2πfT)          ← seule complexe
//   exp. bilatér.  e^{−|t|/T}             2T/(1 + (2πfT)²)
//   sinus cardinal sinc(t/T)              T·rect(fT)             ← dual de la porte
//   sinusoïde      cos(2πf₀t)·Π(t/T)      (T/2)[sinc((f−f₀)T) + sinc((f+f₀)T)]
//     tronquée
//
// Two lessons the magnitude alone cannot teach, so both are observables:
//   · a delay t₀ multiplies X by e^{−j2πft₀} — |X| does not move by a single
//     pixel, the PHASE takes a slope of −2πt₀ (checked as an exact identity);
//   · every characteristic width scales as 1/T — T·B₃ is invariant.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { sinc } from '../../../core/numeric.js';

const NG = 1201; // time grid
const NF = 801; // frequency grid
const DB_FLOOR = -80;
const SIDE_GRID = 4000; // fine grid used to find the first sidelobe

// Half-window of the time axis, in units of T (the delay widens it so the
// signal never walks out of the frame).
const TIME_SPAN = { rect: 2.5, triangle: 2.5, gauss: 2, expo: 6, expo2: 5, sinc: 6, rf: 1.5 };
// Half-width of the frequency axis, in units of 1/T (f₀ added for the RF pulse).
const FREQ_SPAN = { rect: 4, triangle: 4, gauss: 1.5, expo: 4, expo2: 4, sinc: 1.5, rf: 4 };

/** x(t) at u = t − t₀. The rect closes on both edges: the boundary is a measure-zero
 *  set for the transform, and a closed support keeps the check's quadrature exact. */
function xOf(signal, u, T, f0) {
  if (signal === 'rect') return Math.abs(u) <= T / 2 ? 1 : 0;
  if (signal === 'triangle') return Math.max(0, 1 - Math.abs(u) / T);
  if (signal === 'gauss') return Math.exp(-Math.PI * (u / T) ** 2);
  if (signal === 'expo') return u < 0 ? 0 : Math.exp(-u / T);
  if (signal === 'expo2') return Math.exp(-Math.abs(u) / T);
  if (signal === 'sinc') return sinc(u / T);
  return Math.abs(u) <= T / 2 ? Math.cos(2 * Math.PI * f0 * u) : 0; // rf
}

/** X₀(f) = [Re, Im], before the delay factor. Only the causal exponential is complex. */
function X0(signal, f, T, f0) {
  if (signal === 'rect') return [T * sinc(f * T), 0];
  if (signal === 'triangle') return [T * sinc(f * T) ** 2, 0];
  if (signal === 'gauss') return [T * Math.exp(-Math.PI * (f * T) ** 2), 0];
  if (signal === 'expo') {
    const w = 2 * Math.PI * f * T;
    const d = 1 + w * w;
    return [T / d, (-T * w) / d];
  }
  if (signal === 'expo2') return [(2 * T) / (1 + (2 * Math.PI * f * T) ** 2), 0];
  if (signal === 'sinc') {
    const a = Math.abs(f * T);
    return [a < 0.5 ? T : a > 0.5 ? 0 : T / 2, 0]; // rect, half value at the edge
  }
  return [(T / 2) * (sinc((f - f0) * T) + sinc((f + f0) * T)), 0]; // rf
}

/** |X(f)| — the delay leaves it untouched, which is exactly the point. */
const magOf = (signal, f, T, f0) => Math.hypot(...X0(signal, f, T, f0));

/** Energy, closed form (Parseval-checked in check.js). */
function energyOf(signal, T, f0) {
  if (signal === 'rect') return T;
  if (signal === 'triangle') return (2 * T) / 3;
  if (signal === 'gauss') return T / Math.SQRT2;
  if (signal === 'expo') return T / 2;
  if (signal === 'expo2') return T;
  if (signal === 'sinc') return T;
  return (T / 2) * (1 + sinc(2 * f0 * T)); // rf
}

/** Half-width of the main lobe at −3 dB, by bisection from the peak. */
function bandwidth3dB(signal, T, f0, fp, peak) {
  const target = peak / Math.SQRT2;
  let hi = 0.5 / T;
  for (let i = 0; i < 60 && magOf(signal, fp + hi, T, f0) > target; i++) hi *= 1.6;
  let lo = 0;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (magOf(signal, fp + mid, T, f0) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** First zero of |X|, as a half-width from the peak (NaN when there is none). */
function firstNullOf(signal, T) {
  if (signal === 'rect' || signal === 'triangle' || signal === 'rf') return 1 / T;
  if (signal === 'sinc') return 1 / (2 * T); // band edge, not a zero crossing
  return NaN;
}

/** Highest sidelobe beyond the first null, in dB below the peak. */
function sidelobeDbOf(signal, T, f0, fp, peak) {
  const n0 = firstNullOf(signal, T);
  if (!Number.isFinite(n0) || signal === 'sinc') return NaN;
  let best = 0;
  for (let i = 1; i <= SIDE_GRID; i++) {
    const d = n0 * (1 + (19 * i) / SIDE_GRID);
    best = Math.max(best, magOf(signal, fp + d, T, f0));
  }
  return 20 * Math.log10(best / peak);
}

const wrap = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

/**
 * @param {{signal: string, T: number, f0: number, t0: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ signal, T: Tms, f0, t0: t0ms }) {
  const T = Tms / 1000; // ms → s
  const t0 = t0ms / 1000;

  /* ---------- time ------------------------------------------------------- */
  const W = TIME_SPAN[signal] * T + Math.abs(t0);
  const t = new Float64Array(NG);
  const xt = new Float64Array(NG);
  for (let i = 0; i < NG; i++) {
    const ti = -W + (2 * W * i) / (NG - 1);
    t[i] = ti * 1000; // ms for display
    xt[i] = xOf(signal, ti - t0, T, f0);
  }

  /* ---------- frequency: magnitude, dB, phase ----------------------------- */
  const fp = signal === 'rf' ? f0 : 0; // where the spectrum peaks
  const F = FREQ_SPAN[signal] / T + (signal === 'rf' ? f0 : 0);
  const peak = magOf(signal, fp, T, f0);

  const f = new Float64Array(NF);
  const mag = new Float64Array(NF);
  const magDb = new Float64Array(NF);
  const phRaw = new Float64Array(NF);
  for (let i = 0; i < NF; i++) {
    f[i] = -F + (2 * F * i) / (NF - 1);
    const [re, im] = X0(signal, f[i], T, f0);
    mag[i] = Math.hypot(re, im);
    magDb[i] = Math.max(DB_FLOOR, 20 * Math.log10(mag[i] / peak + 1e-300));
    // arg X = arg X₀ − 2πf t₀ — the delay is a pure phase ramp
    phRaw[i] = wrap(Math.atan2(im, re) - 2 * Math.PI * f[i] * t0);
  }
  // break the drawn path at the ±π wraps (a jump of exactly π — the sign
  // change of a real transform — is NOT a wrap and stays connected)
  const pfx = [];
  const pfy = [];
  for (let i = 0; i < NF; i++) {
    if (i > 0 && Math.abs(phRaw[i] - phRaw[i - 1]) > 1.5 * Math.PI) {
      pfx.push(NaN);
      pfy.push(NaN);
    }
    pfx.push(f[i]);
    pfy.push(phRaw[i]);
  }

  /* ---------- widths ------------------------------------------------------ */
  const b3 = bandwidth3dB(signal, T, f0, fp, peak);

  return {
    observables: {
      xt: { x: t, y: xt },
      mag: { x: f, y: mag },
      magDb: { x: f, y: magDb },
      phase: { x: Float64Array.from(pfx), y: Float64Array.from(pfy) },
      level3: peak / Math.SQRT2, // hline: the −3 dB level
      bw3p: fp + b3, // vlines: the −3 dB half-width around the peak
      bw3n: fp - b3,
      peak: { value: peak, meta: { label: '|X| max', precision: 4 } },
      energy: {
        value: energyOf(signal, T, f0) * 1000,
        meta: { label: 'energy', unit: 'ms', precision: 3 },
      },
      b3: {
        value: b3,
        meta: { label: '−3 dB bandwidth (one-sided)', unit: 'Hz', precision: 0 },
      },
      tb: {
        value: b3 * T,
        meta: { label: 'product T·B₃ (scale invariant)', precision: 4 },
      },
      firstNull: {
        value: firstNullOf(signal, T),
        meta: { label: 'first zero', unit: 'Hz', precision: 0 },
      },
      sidelobe: {
        value: sidelobeDbOf(signal, T, f0, fp, peak),
        meta: { label: 'lobe secondaire', unit: 'dB', precision: 2 },
      },
    },
  };
}

// Exported for check.js: the harness integrates the very functions the
// experiment draws, so a numerical Fourier integral can be confronted with the
// closed form without either being restated.
export { xOf, X0, energyOf };
