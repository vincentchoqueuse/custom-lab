// FIR low-pass design by the window method, the classic three-act story:
//   1. the ideal impulse response 2fc/Fs·sinc(2fc/Fs·(n−M)) is infinite and
//      non-causal → TRUNCATE to N taps (and shift by M = (N−1)/2: the delay);
//   2. brutal truncation (rect) leaves the Gibbs ripple: the first stopband
//      lobe stays at ≈ −21 dB NO MATTER how large N gets;
//   3. a window trades transition width for stopband level (−21 rect,
//      ≈ −44 Hann, ≈ −53 Hamming, ≈ −74 Blackman — tabulated, checked).
// Symmetric taps ⇒ exact linear phase: a filtered signal comes out clean
// but LATE by exactly M samples — shown on a square wave, checked on a
// sine. Fs = 8 kHz throughout (consistent with the DAC experiment).
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { fft, sinc, toDb, windowValue } from '../../../core/numeric.js';

const FS = 8000;
const NFFT = 4096; // response resolution (1.95 Hz bins)
const DB_FLOOR = -110;
const F_SQ = 100; // test square wave (Hz)
const N_SIG = 720; // test-signal samples shown (90 ms)


/**
 * @param {{fc: number, N: number, win: string, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ fc, N, win }) {
  const M = (N - 1) / 2;
  const nu = (2 * fc) / FS;

  // windowed-sinc taps (kept symmetric: exact linear phase)
  const h = new Float64Array(N);
  let dc = 0;
  for (let n = 0; n < N; n++) {
    h[n] = nu * sinc(nu * (n - M)) * windowValue(win, n, N, true);
    dc += h[n];
  }

  // impulse view: taps + the ideal (infinite) response on a dense grid
  const tapIdx = new Float64Array(N);
  for (let n = 0; n < N; n++) tapIdx[n] = n;
  const ND = 400;
  const ix = new Float64Array(ND);
  const iy = new Float64Array(ND);
  for (let i = 0; i < ND; i++) {
    const t = ((N - 1) * i) / (ND - 1);
    ix[i] = t;
    iy[i] = nu * sinc(nu * (t - M));
  }

  // frequency response (zero-padded FFT of the taps)
  const re = new Float64Array(NFFT);
  const im = new Float64Array(NFFT);
  re.set(h);
  fft(re, im);
  const binHz = FS / NFFT;
  const nh = NFFT / 2;
  const rf = new Float64Array(nh + 1);
  const ry = new Float64Array(nh + 1);
  for (let k = 0; k <= nh; k++) {
    rf[k] = k * binHz;
    ry[k] = toDb(Math.hypot(re[k], im[k]), DB_FLOOR);
  }

  // highest stopband lobe: walk down the transition slope from fc to the
  // FIRST null, then take the max beyond — window-agnostic, and it catches
  // the first (highest) lobe that a fixed margin would skip
  let edge = Math.ceil(fc / binHz);
  while (edge < nh && ry[edge + 1] < ry[edge]) edge++;
  let sidelobe = DB_FLOOR;
  for (let k = edge + 1; k <= nh; k++) sidelobe = Math.max(sidelobe, ry[k]);

  // test signal: a square wave through the filter (linear convolution)
  const xin = new Float64Array(N_SIG);
  for (let n = 0; n < N_SIG; n++) {
    xin[n] = Math.sign(Math.sin((2 * Math.PI * F_SQ * n) / FS)) || 1;
  }
  const yout = new Float64Array(N_SIG);
  for (let n = 0; n < N_SIG; n++) {
    let acc = 0;
    for (let k = 0; k < N && k <= n; k++) acc += h[k] * xin[n - k];
    yout[n] = acc;
  }
  const ts = new Float64Array(N_SIG);
  for (let n = 0; n < N_SIG; n++) ts[n] = (n / FS) * 1000;

  return {
    observables: {
      taps: { x: tapIdx, y: h },
      idealIR: { x: ix, y: iy },
      response: { x: rf, y: ry },
      sqIn: { x: ts, y: xin },
      sqOut: { x: ts, y: yout },
      hTaps: h, // raw taps (Inspector download, symmetry check)
      sidelobe: {
        value: sidelobe,
        meta: { label: 'lobe max en bande coupée', unit: 'dB', precision: 1 },
      },
      delayMs: {
        value: (M / FS) * 1000,
        meta: { label: 'retard (N−1)/2', unit: 'ms', precision: 2 },
      },
      dcGain: { value: dc, meta: { label: 'H(0) = Σh', precision: 4 } },
    },
  };
}
