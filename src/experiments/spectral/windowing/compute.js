// Spectral windowing and resolution: two sines (f1, and f2 = f1 + Δf at
// A2 dB) observed over N samples, windowed (rect / Hann / Hamming /
// Blackman, PERIODIC definitions so the DFT identities are exact),
// zero-padded and DFT'd. The spectrum is normalized by the window's
// coherent gain Σw/2, so a full-scale tone reads 0 dB regardless of the
// window. Exact identities used by check.js: Parseval through the
// zero-padded DFT, and periodic-Hann ENBW = 1.5 bins.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { magSpectrum, magHalf, spectrumComplex } from '../../../core/dsp.js';
import { fft, toDb as coreToDb, windowValue } from '../../../core/numeric.js';

const FS = 1000; // sampling rate (Hz)
const PHI2 = 1.0; // second-tone phase (rad) — avoids coherent addition
const DB_FLOOR = -120;
const KPAD = 16; // fixed padding for the window-kernel view
const KBINS = 12; // kernel view span (bins of Fs/N)

/* ------------------------------------------------------------------------ */
/* The THEORY of the sidelobes — computed, never tabulated                   */
/* ------------------------------------------------------------------------ */
//
// The height of the highest sidelobe is THE number of the course: −13 dB for
// the rectangular window, −31 for Hann, −43 for Hamming, −58 for Blackman. One
// can write it on the board; one can also compute it and confront it with what
// the screen shows, which is what the instrument is for.
//
// The four windows are SUMS OF COSINES, w[n] = Σ c_m cos(2πmn/N), and the DTFT
// of a windowed cosine is a shifted Dirichlet kernel:
//
//   W(b) = Σ_m (c_m/2)·[D(b−m) + D(b+m)],  D(u) = A(u)·e^{−jπu(N−1)/N}
//   A(u) = sin(πu)/sin(πu/N),  A(0) = N
//
// with b the frequency IN BINS of Fs/N. The closed form is worth exactly what
// the direct sum is worth (verified to 1e-16 over the four windows and
// N = 64…1024), but it costs three terms instead of N — which matters, because
// the maximum is found by sweeping and then refined, and a slider moves at
// 30 Hz.
//
// The result DEPENDS ON N, and that is an honesty the table hides: the −42.7 dB
// of Hamming is the N → ∞ limit, and at N = 64 the window is too short to reach
// it (−42.4). The theory displayed is that of the window actually used, not of
// an ideal one.
const WINDOW_COS = Object.freeze({
  rect: [1],
  hann: [0.5, -0.5],
  hamming: [0.54, -0.46],
  blackman: [0.42, -0.5, 0.08],
});

const dirichletAmp = (u, N) => {
  if (Math.abs(u) < 1e-12) return N;
  const d = Math.sin((Math.PI * u) / N);
  return Math.abs(d) < 1e-15 ? N : Math.sin(Math.PI * u) / d;
};

/** |W(b)| of the window, b in bins of Fs/N — exact DTFT, in closed form. */
export function windowSpectrum(win, N, b) {
  const c = WINDOW_COS[win];
  let re = 0;
  let im = 0;
  for (let m = 0; m < c.length; m++) {
    const shifts = m === 0 ? [b] : [b - m, b + m];
    const gain = m === 0 ? c[0] : c[m] / 2;
    for (const u of shifts) {
      const g = gain * dirichletAmp(u, N);
      const ph = (-Math.PI * u * (N - 1)) / N;
      re += g * Math.cos(ph);
      im += g * Math.sin(ph);
    }
  }
  return Math.hypot(re, im);
}

/**
 * Theoretical height of the highest sidelobe, in dB below the main lobe, and its
 * position in bins. Sweep at 1/64 of a bin past the first zero, then a golden
 * section on the peak found: the value therefore does not depend on the sweep
 * step, unlike what the screen reads.
 */
export function theoreticalSidelobe(win, N, span = 16) {
  const w0 = windowSpectrum(win, N, 0);
  const step = 1 / 64;
  // leave the main lobe: as far as the first minimum
  let prev = w0;
  let edge = step;
  for (let b = step; b < span; b += step) {
    const v = windowSpectrum(win, N, b);
    if (v > prev) break;
    prev = v;
    edge = b;
  }
  let best = 0;
  let bestB = edge;
  for (let b = edge; b < span; b += step) {
    const v = windowSpectrum(win, N, b);
    if (v > best) {
      best = v;
      bestB = b;
    }
  }
  let lo = bestB - step;
  let hi = bestB + step;
  const R = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 60; i++) {
    const c1 = hi - R * (hi - lo);
    const c2 = lo + R * (hi - lo);
    if (windowSpectrum(win, N, c1) > windowSpectrum(win, N, c2)) hi = c2;
    else lo = c1;
  }
  const b = (lo + hi) / 2;
  return { db: 20 * Math.log10(windowSpectrum(win, N, b) / w0), bin: b };
}

/** |FFT(x zero-padded to nfft)| — returns the magnitude of bins 0..nfft/2. */

const toDb = (m, ref) => coreToDb(m / ref, DB_FLOOR);

/**
 * @param {{N: number, pad: number, f1: number, df: number, a2: number,
 *          win: string, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ N, pad, f1, df, a2, win }) {
  const f2 = f1 + df;
  const A2 = 10 ** (a2 / 20);
  const nfft = N * pad;

  const w = new Float64Array(N);
  const xw = new Float64Array(N);
  let sw = 0;
  let sw2 = 0;
  let energy = 0;
  for (let n = 0; n < N; n++) {
    w[n] = windowValue(win, n, N);
    const x =
      Math.sin((2 * Math.PI * f1 * n) / FS) + A2 * Math.sin((2 * Math.PI * f2 * n) / FS + PHI2);
    xw[n] = x * w[n];
    sw += w[n];
    sw2 += w[n] * w[n];
    energy += xw[n] * xw[n];
  }
  const ref = sw / 2; // coherent gain: a full-scale sine peaks at 0 dB

  // xw already carries the window: the spectrum must not apply another
  const { re, im } = spectrumComplex(xw, { nfft });
  const mag = magHalf(re, im);

  // Parseval through the zero-padded DFT (exact identity, checked)
  let specEnergy = 0;
  for (let k = 0; k < nfft; k++) specEnergy += re[k] * re[k] + im[k] * im[k];
  const parsevalGap = Math.abs(energy - specEnergy / nfft) / energy;

  // spectrum sliced around the two tones (features live at the bin scale,
  // invisible on a full 0..Fs/2 axis)
  const binHz = FS / nfft;
  const fLo = Math.max(0, f1 - 80);
  const fHi = Math.min(FS / 2, f2 + 80);
  const kLo = Math.max(0, Math.floor(fLo / binHz));
  const kHi = Math.min(nfft / 2, Math.ceil(fHi / binHz));
  const sf = new Float64Array(kHi - kLo + 1);
  const sy = new Float64Array(kHi - kLo + 1);
  let peakDb = DB_FLOOR;
  let peakF = 0;
  for (let k = kLo; k <= kHi; k++) {
    sf[k - kLo] = k * binHz;
    const db = toDb(mag[k], ref);
    sy[k - kLo] = db;
    if (db > peakDb) {
      peakDb = db;
      peakF = k * binHz;
    }
  }

  // window kernel |W(f)| at fixed fine padding, x in bins of Fs/N
  const kfft = N * KPAD;
  const km = magSpectrum(w, { nfft: kfft });
  const kMax = Math.min(kfft / 2, KBINS * KPAD);
  const kb = new Float64Array(kMax + 1);
  const ky = new Float64Array(kMax + 1);
  for (let k = 0; k <= kMax; k++) {
    kb[k] = k / KPAD;
    ky[k] = toDb(km[k], sw); // kernel normalized to 0 dB at f = 0
  }

  // measured highest sidelobe: past the first local minimum of the kernel
  let edge = 1;
  while (edge < kMax && km[edge + 1] < km[edge]) edge++;
  let sidelobe = DB_FLOOR;
  for (let k = edge; k <= kMax; k++) sidelobe = Math.max(sidelobe, ky[k]);

  // what the theory says about the same number, for the window ACTUALLY used —
  // and the gap with what the plot shows, which is that of the discretization
  // step: at 16× zero-padding the top of the lobe is not sampled, so the
  // measurement passes slightly BELOW the theory
  const th = theoreticalSidelobe(win, N);

  const enbw = (N * sw2) / (sw * sw);

  // windowed signal + envelope (time view)
  const ns = new Float64Array(N);
  const envU = new Float64Array(N);
  const envL = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    ns[n] = n;
    envU[n] = (1 + A2) * w[n];
    envL[n] = -envU[n];
  }

  return {
    observables: {
      spectrum: { x: sf, y: sy },
      kernel: { x: kb, y: ky },
      signal: { x: ns, y: xw },
      envUp: { x: ns, y: envU },
      envDown: { x: ns, y: envL },
      f2, // second-tone frequency (vline)
      parsevalGap, // checks
      peakDb, // checks
      peakF, // checks
      enbw: { value: enbw, meta: { label: 'ENBW', unit: 'bins', precision: 3 } },
      sidelobe: {
        value: sidelobe,
        meta: { label: 'lobes secondaires (lu)', unit: 'dB', precision: 2 },
      },
      sidelobeTheory: {
        value: th.db,
        meta: { label: 'theory', unit: 'dB', precision: 2 },
      },
      sidelobeTheoryLine: th.db, // hline on the kernel view
      sidelobeBinLine: th.bin, // vline : où la théorie place ce sommet
      sidelobeBin: {
        value: th.bin,
        meta: { label: 'at', unit: 'bins', precision: 3 },
      },
      sidelobeGap: {
        value: sidelobe - th.db,
        meta: { label: 'measured − theory', unit: 'dB', precision: 2 },
      },
      binWidth: {
        value: FS / N,
        meta: { label: 'line width Fs/N', unit: 'Hz', precision: 2 },
      },
    },
  };
}
