// Sampling IS periodizing the spectrum — the Poisson summation formula:
//   Σₙ x(nTs)·e^{−j2πf·nTs}  =  Fs · Σₖ X(f − k·Fs)
// The left side is what the samples know (their DTFT); the right side is the
// true spectrum copied every Fs. The experiment draws both and they land on
// top of each other — that superposition IS the theorem. Both sides are
// truncated sums (the DTFT over n, the copies over k), so the identity is
// numerically exact only where both converge fast: on the GAUSSIAN it holds
// to 4e-16, which is what the strict check uses; the 1/f² spectra leave a
// ~1e-3 residue that is truncation, not physics.
// Four signals, each with a CLOSED-FORM transform, so nothing here is
// approximated (all are real, even and non-negative: the copies simply add,
// which is what makes the overlap readable):
//   Gaussian     x = exp(−π(t/τ)²)        X = τ·exp(−π(fτ)²)
//   triangle     x = max(0, 1−|t|/τ)      X = τ·sinc²(fτ)
//   sinc         x = sinc(t/τ)            X = τ·rect(fτ)  ← STRICTLY bandlimited
//   exponentielle x = exp(−|t|/τ)         X = 2τ/(1+(2πfτ)²)
// Only the sinc is bandlimited (|f| < 1/2τ): it is the only one whose
// aliasing error falls to EXACTLY zero once Fs > 1/τ — Shannon, shown rather
// than stated. The others alias forever, less and less.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { sinc } from '../../../core/numeric.js';

const T_SPAN = 0.06; // displayed half-window (s)
const NG = 801; // dense "continuous" grid
const F_MAX = 400; // FIXED frequency axis (Hz) — the copies march in, not the axis
const NF = 641;
// How many shifted copies to sum: the tails matter as long as the spectrum
// decays slowly (the triangle and the exponential go as 1/f²), so the count
// adapts to Fs·τ instead of being a fixed guess.
const copyCount = (fs, tau) => Math.min(80, Math.max(8, Math.ceil(24 / (fs * tau))));
const DTFT_STRIDE = 8; // draw one DTFT dot every 8 grid points
const NSWEEP = 60;

/** x(t) — the four sources. */
function xOf(signal, t, tau) {
  if (signal === 'gauss') return Math.exp(-Math.PI * (t / tau) ** 2);
  if (signal === 'triangle') return Math.max(0, 1 - Math.abs(t) / tau);
  if (signal === 'sinc') return sinc(t / tau);
  return Math.exp(-Math.abs(t) / tau); // two-sided exponential
}

/** X(f) — closed form, real and non-negative for all four. */
function XOf(signal, f, tau) {
  if (signal === 'gauss') return tau * Math.exp(-Math.PI * (f * tau) ** 2);
  if (signal === 'triangle') return tau * sinc(f * tau) ** 2;
  if (signal === 'sinc') {
    const a = Math.abs(f * tau);
    return a < 0.5 ? tau : a > 0.5 ? 0 : tau / 2; // rect, half value at the edge
  }
  return (2 * tau) / (1 + (2 * Math.PI * f * tau) ** 2);
}

/** Σₖ X(f − k·Fs) — the periodized spectrum, without the 1/Ts factor. */
const periodizedAt = (signal, f, tau, fs) => {
  const K = copyCount(fs, tau);
  let s = 0;
  for (let k = -K; k <= K; k++) s += XOf(signal, f - k * fs, tau);
  return s;
};

/**
 * @param {{signal: string, fs: number, tau: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ signal, fs, tau: tauMs }) {
  const tau = tauMs / 1000; // ms → s
  const Ts = 1 / fs;

  /* ---------- time: the signal and its samples ---------------------------- */
  const t = new Float64Array(NG);
  const xt = new Float64Array(NG);
  for (let i = 0; i < NG; i++) {
    t[i] = (-T_SPAN + (2 * T_SPAN * i) / (NG - 1)) * 1000; // ms for display
    xt[i] = xOf(signal, t[i] / 1000, tau);
  }
  const nMax = Math.floor(T_SPAN / Ts);
  const st = new Float64Array(2 * nMax + 1);
  const sv = new Float64Array(2 * nMax + 1);
  for (let n = -nMax; n <= nMax; n++) {
    st[n + nMax] = n * Ts * 1000;
    sv[n + nMax] = xOf(signal, n * Ts, tau);
  }

  /* ---------- frequency: central copy, neighbours, their sum -------------- */
  const f = new Float64Array(NF);
  const central = new Float64Array(NF);
  const periodized = new Float64Array(NF);
  for (let i = 0; i < NF; i++) {
    f[i] = -F_MAX + (2 * F_MAX * i) / (NF - 1);
    central[i] = XOf(signal, f[i], tau);
    periodized[i] = periodizedAt(signal, f[i], tau, fs);
  }
  // the neighbouring copies as ONE series broken by NaN (the generic Line
  // splits its path at NaN, so no custom view is needed for the spaghetti)
  const nb = [];
  const nbf = [];
  for (const k of [-2, -1, 1, 2]) {
    for (let i = 0; i < NF; i++) {
      nbf.push(f[i]);
      nb.push(XOf(signal, f[i] - k * fs, tau));
    }
    nbf.push(NaN);
    nb.push(NaN);
  }

  /* ---------- what the samples actually know: their DTFT ------------------ */
  // Σₙ x(nTs)·e^{−j2πf nTs}, summed until the tail is numerically dead, then
  // divided by Fs so it lands on the same scale as Σₖ X(f − k·Fs).
  // Drawn every DTFT_STRIDE points on purpose: dots ON the summed curve show
  // the superposition, a dense line would just hide it.
  const nWide = Math.min(4000, Math.max(nMax, Math.ceil(60 / (tau * fs)) + 200));
  const nd = Math.floor((NF - 1) / DTFT_STRIDE) + 1;
  const df = new Float64Array(nd);
  const dtft = new Float64Array(nd);
  for (let j = 0; j < nd; j++) {
    const i = j * DTFT_STRIDE;
    let re = 0;
    let im = 0;
    for (let n = -nWide; n <= nWide; n++) {
      const v = xOf(signal, n * Ts, tau);
      if (v === 0) continue;
      const w = 2 * Math.PI * f[i] * n * Ts;
      re += v * Math.cos(w);
      im -= v * Math.sin(w);
    }
    df[j] = f[i];
    dtft[j] = Math.hypot(re, im) / fs;
  }

  /* ---------- aliasing error inside the base band ------------------------- */
  const errorAt = (feTsst) => {
    let num = 0;
    let den = 0;
    const NB = 241;
    for (let i = 0; i < NB; i++) {
      const fi = (-feTsst / 2) + (feTsst * i) / (NB - 1);
      const p = periodizedAt(signal, fi, tau, feTsst);
      const c = XOf(signal, fi, tau);
      num += (p - c) ** 2;
      den += c * c;
    }
    return den > 0 ? Math.sqrt(num / den) : 0;
  };
  const sf = new Float64Array(NSWEEP);
  const se = new Float64Array(NSWEEP);
  for (let i = 0; i < NSWEEP; i++) {
    sf[i] = 60 + (640 * i) / (NSWEEP - 1);
    se[i] = 100 * errorAt(sf[i]);
  }

  const bandEdge = 1 / (2 * tau); // where the sinc's rect stops
  const dcSamples = sv.reduce((a, b) => a + b, 0); // Σₙ x(nTs) — Poisson at f = 0

  return {
    observables: {
      xt: { x: t, y: xt },
      samples: { x: st, y: sv },
      central: { x: f, y: central },
      copies: { x: Float64Array.from(nbf), y: Float64Array.from(nb) },
      periodized: { x: f, y: periodized },
      dtft: { x: df, y: dtft },
      errVsFs: { x: sf, y: se },
      feHalf: fs / 2, // vline
      feHalfNeg: -fs / 2,
      dcSamples, // checks (Poisson at f = 0)
      aliasErr: {
        value: 100 * errorAt(fs),
        meta: { label: 'in-band aliasing', unit: '%', precision: 2 },
      },
      nyq: { value: fs / 2, meta: { label: 'Fs/2', unit: 'Hz', precision: 0 } },
      bandEdge: {
        value: signal === 'sinc' ? bandEdge : NaN,
        meta: { label: 'band edge 1/2τ', unit: 'Hz', precision: 0 },
      },
    },
  };
}
