// Truncation in time: what observing a signal for a FINITE duration T does to
// its spectrum. Multiplying by a window in time convolves by that window's
// transform in frequency, so a line of zero width becomes a lobe of width
// ≈ 1/T — the duration sets the resolution, the window shape sets the skirts.
//
// Four signals, chosen because truncation does something DIFFERENT to each:
//   sinusoïde        the reference: width ∝ 1/T, forever
//   chirp            sweeps k Hz/s, so a LONGER window sees a WIDER band:
//                    the width falls as 1/T, then rises as k·T, and the
//                    interior minimum IS the Gabor compromise — measured, not
//                    asserted, since the crossover (k·T² of order one) is not
//                    a clean closed form
//   sinusoïde amortie the line stops narrowing once T ≫ τ: the signal itself
//                    has a natural width 1/(πτ) that no window can beat
//   salve            once T covers the burst, widening the window adds zeros
//                    and nothing else — zero-padding interpolates, it does
//                    not resolve
//
// The signals are defined on t ≥ 0 INDEPENDENTLY of T: moving the duration
// moves the observation, never the signal. Everything is discrete (Fs), the
// FFT is zero-padded far beyond the record so what is drawn is the continuous
// transform of the truncated signal, not a coarse bin grid.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { fft, toDb as coreToDb, windowValue } from '../../../core/numeric.js';

const FS = 8000; // sampling rate (Hz)
const NFFT = 32768; // display transform: Fs/NFFT ≈ 0.24 Hz per point
const NFFT_SWEEP = 16384; // width-vs-duration sweep
const NSWEEP = 30;
const F_MAX = 2000; // displayed band (Hz)
const NT = 900; // dense grid for the drawn signal
const DB_FLOOR = -90;
const T_MIN = 3; // sweep bounds (ms) — match the T param
const T_MAX = 250;

/** x(t), t in seconds — defined for t ≥ 0, independent of the window. */
export function signalValue(sig, t, { f0, k, tau, tb }) {
  if (sig === 'chirp') return Math.sin(2 * Math.PI * (f0 * t + (k * t * t) / 2));
  if (sig === 'damped') return Math.exp(-t / (tau / 1000)) * Math.sin(2 * Math.PI * f0 * t);
  if (sig === 'burst') return t < tb / 1000 ? Math.sin(2 * Math.PI * f0 * t) : 0;
  return Math.sin(2 * Math.PI * f0 * t); // sine
}

/** The N = ⌊T·Fs⌋ samples actually transformed, window applied. */
export function windowedSamples(p, Tms) {
  const N = Math.max(4, Math.round((Tms / 1000) * FS));
  const xw = new Float64Array(N);
  for (let n = 0; n < N; n++)
    xw[n] = signalValue(p.sig, n / FS, p) * windowValue(p.win, n, N, true);
  return xw;
}

/** |X_T(f)| on the zero-padded grid — the transform of the truncated signal. */
export function spectrumOf(p, Tms, nfft = NFFT) {
  const xw = windowedSamples(p, Tms);
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  re.set(xw.subarray(0, Math.min(xw.length, nfft)));
  fft(re, im);
  const nh = nfft / 2;
  const mag = new Float64Array(nh + 1);
  for (let j = 0; j <= nh; j++) mag[j] = Math.hypot(re[j], im[j]);
  return { mag, binHz: FS / nfft, n: xw.length, re, im };
}

/**
 * Full width of the main peak at −3 dB, in Hz, with linear interpolation
 * between grid points (the grid is finer than the feature, but not by so much
 * that rounding to a point would be honest).
 */
export function width3dB(mag, binHz, fMax = F_MAX) {
  const kMax = Math.min(mag.length - 1, Math.round(fMax / binHz));
  let kp = 0;
  for (let k = 1; k <= kMax; k++) if (mag[k] > mag[kp]) kp = k;
  const half = mag[kp] / Math.SQRT2;
  if (!(mag[kp] > 0)) return NaN;
  const cross = (from, dir) => {
    for (let k = from; k >= 0 && k <= kMax; k += dir) {
      if (mag[k] <= half) {
        const a = mag[k - dir];
        const t = (a - half) / (a - mag[k] || 1);
        return (k - dir + dir * t) * binHz;
      }
    }
    return NaN;
  };
  return cross(kp, +1) - cross(kp, -1);
}

/**
 * @param {{sig: string, win: string, T: number, f0: number, k: number,
 *          tau: number, tb: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute(params) {
  const { sig, win, T } = params;

  /* ---------- time: the signal, the gate, the product -------------------- */
  // the frame keeps a fixed share of discarded signal visible on the right,
  // so the window is always seen CUTTING something
  const span = Math.min(T_MAX + 10, Math.max(20, 2.5 * T));
  const tf = new Float64Array(NT);
  const xf = new Float64Array(NT);
  const wf = new Float64Array(NT);
  for (let i = 0; i < NT; i++) {
    const t = (span * i) / (NT - 1); // ms
    tf[i] = t;
    xf[i] = signalValue(sig, t / 1000, params);
    // the window drawn as a continuous gate, zero outside [0, T]
    const u = t / T;
    wf[i] = u > 1 ? 0 : windowValue(win, u * 1000, 1000, true);
  }
  const xw = windowedSamples(params, T);
  const N = xw.length;
  const tw = new Float64Array(N);
  for (let n = 0; n < N; n++) tw[n] = (n / FS) * 1000;

  /* ---------- frequency: the truncated spectrum -------------------------- */
  const { mag, binHz } = spectrumOf(params, T);
  const kMax = Math.min(mag.length - 1, Math.round(F_MAX / binHz));
  let peak = 0;
  for (let k = 0; k <= kMax; k++) peak = Math.max(peak, mag[k]);
  // one point per ~0.5 Hz is already far finer than any visible feature
  const stride = Math.max(1, Math.floor(0.5 / binHz));
  const ns = Math.floor(kMax / stride) + 1;
  const sf = new Float64Array(ns);
  const sy = new Float64Array(ns);
  for (let j = 0; j < ns; j++) {
    sf[j] = j * stride * binHz;
    sy[j] = coreToDb(mag[j * stride] / (peak || 1), DB_FLOOR);
  }
  const b3 = width3dB(mag, binHz);

  /* ---------- the width, swept over the duration ------------------------- */
  const sweepT = new Float64Array(NSWEEP);
  const sweepB = new Float64Array(NSWEEP);
  for (let i = 0; i < NSWEEP; i++) {
    const Ti = T_MIN * (T_MAX / T_MIN) ** (i / (NSWEEP - 1));
    const s = spectrumOf(params, Ti, NFFT_SWEEP);
    sweepT[i] = Ti;
    sweepB[i] = width3dB(s.mag, s.binHz);
  }

  return {
    observables: {
      xFull: { x: tf, y: xf },
      gate: { x: tf, y: wf },
      windowed: { x: tw, y: xw },
      spectrum: { x: sf, y: sy },
      widthVsT: { x: sweepT, y: sweepB },
      // the vlines read T and f₀ straight from the params — no observable needed
      nSamples: { value: N, meta: { label: 'échantillons', precision: 0 } },
      b3: { value: b3, meta: { label: 'largeur à −3 dB', unit: 'Hz', precision: 2 } },
      tb3: {
        value: (b3 * T) / 1000,
        meta: { label: 'produit T·B₃', precision: 3 },
      },
      resolution: {
        value: 1000 / T,
        meta: { label: 'résolution 1/T', unit: 'Hz', precision: 2 },
      },
    },
  };
}
