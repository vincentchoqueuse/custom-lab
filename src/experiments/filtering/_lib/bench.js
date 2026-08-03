// The shared "periodic signal through a digital filter" bench — promoted
// when the hand-built FIR experiment became its third consumer after svf
// and comb (repo rule: a pattern repeated twice becomes a generic).
// One sampling rate, one analysis window, one transient discard, one
// steady-state convention — so every filtering experiment reads the same:
//   x = periodicSignal(...)  →  filter  →  steadyTime / steadySpectrumDb
// All pure and worker/Node-safe, importable from compute.js AND check.js.
import { fft, toDb, windowValue } from '../../../core/numeric.js';

export const BENCH = {
  FS: 8000, // sampling rate (Hz)
  NFFT: 4096, // analysis window (bins of 1.953 Hz)
  SKIP: 4096, // discarded transient before any steady-state reading
  F_SHOW: 3000, // spectrum display span (Hz)
};

/** SKIP + NFFT samples of a square or sawtooth at f0. */
export function periodicSignal(source, f0) {
  const N = BENCH.SKIP + BENCH.NFFT;
  const x = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const ph = (f0 * n) / BENCH.FS - Math.floor((f0 * n) / BENCH.FS);
    x[n] = source === 'saw' ? 2 * ph - 1 : ph < 0.5 ? 1 : -1;
  }
  return x;
}

/** Steady-state time view: `periods` periods of f0, x in ms. */
export function steadyTime(sig, f0, periods = 3) {
  const nShow = Math.min(BENCH.NFFT, Math.round((periods / f0) * BENCH.FS));
  const x = new Float64Array(nShow);
  const y = new Float64Array(nShow);
  for (let i = 0; i < nShow; i++) {
    x[i] = (i / BENCH.FS) * 1000;
    y[i] = sig[BENCH.SKIP + i];
  }
  return { x, y };
}

/**
 * Steady-state Hann spectrum in dB over [0, F_SHOW], coherent-gain
 * reference (a unit sine reads 0 dB) — identical windows on input and
 * output spectra cancel in per-bin ratios, which is what the harmonic
 * checks rely on.
 */
export function steadySpectrumDb(sig, floor = -80) {
  const { FS, NFFT, SKIP, F_SHOW } = BENCH;
  const re = new Float64Array(NFFT);
  const im = new Float64Array(NFFT);
  let sw = 0;
  for (let i = 0; i < NFFT; i++) {
    const w = windowValue('hann', i, NFFT);
    re[i] = sig[SKIP + i] * w;
    sw += w;
  }
  fft(re, im);
  const ref = sw / 2;
  const binHz = FS / NFFT;
  const kMax = Math.floor(F_SHOW / binHz);
  const x = new Float64Array(kMax + 1);
  const y = new Float64Array(kMax + 1);
  for (let k = 0; k <= kMax; k++) {
    x[k] = k * binHz;
    y[k] = toDb(Math.hypot(re[k], im[k]) / ref, floor);
  }
  return { x, y };
}

/**
 * Closed-form |H| overlay on the spectrum axis: `gain(f)` sampled over
 * (0, F_SHOW] and converted to dB. Every filtering experiment draws its
 * transfer function this way, on the same grid as its spectra.
 */
export function responseGrid(gain, floor = -80, n = 600) {
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = (BENCH.F_SHOW * (i + 1)) / n;
    y[i] = toDb(gain(x[i]), floor);
  }
  return { x, y };
}
