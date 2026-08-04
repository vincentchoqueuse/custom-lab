// The "call" layer of the computes — the one that makes a compute.js read as
// a sequence of NAMED OPERATIONS rather than a sequence of loops.
//
// The reading rule it serves: inside a compute one should be able to follow the
// science without reading indices. Writing
//
//     const x = tone(N, f0, { fs: FS });
//     const y = addNoise(x, noiseSigma(0.5, snrDb), gauss);
//     const S = dbAmp(magSpectrum(y, { nfft: NFFT, window: 'hann' }));
//
// says exactly what the line does; the three equivalent loops say it too, but
// only on a second reading. The catalogue held nineteen places that built a
// sinusoid by hand and nine that recomputed the same spectrum — that many
// places where an index or a factor-of-two error can slip in with nothing to
// signal it.
//
// This module does NO science: it holds only operations whose definition is
// public and checkable, and the harness pins them once and for all rather than
// once per experiment.
//
// PURE, stateless, no DOM. Importable from compute.js AND check.js.

import { fft, toDb, windowValue } from './numeric.js';

/* --------------------------------------------------------------- grids -- */

/** n evenly spaced points from a to b, both ends included (MATLAB). */
export function linspace(a, b, n) {
  const out = new Float64Array(n);
  if (n === 1) {
    out[0] = a;
    return out;
  }
  const step = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) out[i] = a + i * step;
  return out;
}

/** The sampling instants: n points spaced 1/fs apart, starting at 0. */
export function timeAxis(n, fs) {
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) t[i] = i / fs;
  return t;
}

/**
 * The frequency axis of the HALF spectrum, 0 to fs/2 inclusive — nfft/2 + 1
 * points, the MATLAB convention. The Nyquist point is included because it
 * EXISTS: leaving it out puts a one-bin hole at the end of every plot.
 */
export function freqAxis(nfft, fs) {
  const nh = nfft / 2;
  const f = new Float64Array(nh + 1);
  for (let k = 0; k <= nh; k++) f[k] = (k * fs) / nfft;
  return f;
}

/* ------------------------------------------------------------- signals -- */

/**
 * A sinusoid. `phase` in radians, `amp` as peak amplitude.
 * @param {number} n number of samples
 * @param {number} f frequency (same unit as fs)
 * @param {{fs: number, amp?: number, phase?: number, cos?: boolean}} o
 */
export function tone(n, f, { fs, amp = 1, phase = 0, cos = false }) {
  const x = new Float64Array(n);
  const w = (2 * Math.PI * f) / fs;
  for (let i = 0; i < n; i++) x[i] = amp * (cos ? Math.cos(w * i + phase) : Math.sin(w * i + phase));
  return x;
}

/**
 * The noise standard deviation giving the requested SNR against a known
 * signal power. Written once here because this is ONE place where a
 * factor-of-two mistake does not show: σ² = P/10^(SNR/10), and a sinusoid of
 * amplitude A carries A²/2, not A².
 */
export function noiseSigma(signalPower, snrDb) {
  return Math.sqrt(signalPower / 10 ** (snrDb / 10));
}

/** x + σ·g, in a new array. `gauss` comes from core/rng.js. */
export function addNoise(x, sigma, gauss) {
  const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] + sigma * gauss();
  return y;
}

/** Mean power (1/N)·Σx². */
export function power(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return s / x.length;
}

/** a divided by its absolute maximum — the relative plot of a spectrum. */
export function normalizeMax(a) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
  const out = new Float64Array(a.length);
  const s = m > 0 ? 1 / m : 1;
  for (let i = 0; i < a.length; i++) out[i] = a[i] * s;
  return out;
}

/* ------------------------------------------------------------ transform -- */

/**
 * Inverse DFT, in place, exactly the inverse of `fft` (no hidden convention:
 * ifft(fft(x)) === x). The conjugate trick was rewritten in two experiments,
 * with two different normalizations.
 */
export function ifft(re, im) {
  const n = re.length;
  for (let i = 0; i < n; i++) im[i] = -im[i];
  fft(re, im);
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] = -im[i] / n;
  }
}

/**
 * The magnitude of the HALF spectrum: windowing, zero-padding, |X(k)| for k
 * from 0 to nfft/2 inclusive.
 *
 * The window applies to the SAMPLES, not to nfft — windowing the zero-padding
 * would multiply the signal by the beginning of a much longer window, and so
 * distort it. That is the mistake this signature makes impossible.
 *
 * @param {ArrayLike<number>} x
 * @param {{nfft?: number, window?: string, symmetric?: boolean}} o
 */
export function magSpectrum(x, opts = {}) {
  const { re, im } = spectrumComplex(x, opts);
  return magHalf(re, im);
}

/**
 * The half-spectrum magnitude of an ALREADY computed transform. Without it, an
 * experiment needing both the complex spectrum and its magnitude transformed
 * twice — which does not show, except on a stopwatch.
 */
export function magHalf(re, im) {
  const nh = re.length / 2;
  const mag = new Float64Array(nh + 1);
  for (let k = 0; k <= nh; k++) mag[k] = Math.hypot(re[k], im[k]);
  return mag;
}

/**
 * The COMPLETE transform, windowed and zero-padded — of which `magSpectrum`
 * is only the magnitude. It exists because Parseval is verified on the whole
 * spectrum, not on half of it: an experiment checking its energy needs both
 * halves, and should not have to redo the windowing for that.
 */
export function spectrumComplex(
  x,
  { nfft = nextPow2(x.length), window = 'rect', symmetric = false } = {}
) {
  const n = Math.min(x.length, nfft);
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  for (let i = 0; i < n; i++) re[i] = x[i] * windowValue(window, i, n, symmetric);
  fft(re, im);
  return { re, im };
}

/** The smallest power of two ≥ n. */
export function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/* ------------------------------------------------------------ decibels -- */

/**
 * dB of an AMPLITUDE: 20·log10. An explicit alias of `toDb`, so that the
 * factor lives in the NAME of the function rather than in the head of whoever
 * reads it back.
 */
export const dbAmp = toDb;

/**
 * dB of a POWER: 10·log10.
 *
 * It exists because its absence cost a real bug: a power spectral density put
 * through `toDb` comes out TWICE too large in dB, and the plot stays perfectly
 * plausible — it only becomes wrong when a value is read off it. Two named
 * functions beat one comment.
 */
export function dbPower(p, floor = -Infinity) {
  return Math.max(floor, 10 * Math.log10(p + 1e-300));
}

/** The whole vector in amplitude dB, with a floor. */
export function dbAmpAll(a, floor = -Infinity) {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = toDb(a[i], floor);
  return out;
}

/**
 * The highest point of the spectrum around a given frequency — the reading
 * "how big is the line at f₀", without assuming it falls exactly on a bin.
 * @param {ArrayLike<number>} mag half spectrum
 * @param {number} f frequency looked for
 * @param {{fs: number, nfft: number, width?: number}} o `width` in bins
 */
export function peakNear(mag, f, { fs, nfft, width = 6 }) {
  const c = Math.round((f * nfft) / fs);
  let m = -Infinity;
  for (let k = Math.max(0, c - width); k <= Math.min(mag.length - 1, c + width); k++)
    m = Math.max(m, mag[k]);
  return m;
}
