// Spectral windowing and resolution: two sines (f1, and f2 = f1 + Δf at
// A2 dB) observed over N samples, windowed (rect / Hann / Hamming /
// Blackman, PERIODIC definitions so the DFT identities are exact),
// zero-padded and DFT'd. The spectrum is normalized by the window's
// coherent gain Σw/2, so a full-scale tone reads 0 dB regardless of the
// window. Exact identities used by check.js: Parseval through the
// zero-padded DFT, and periodic-Hann ENBW = 1.5 bins.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { fft, toDb as coreToDb, windowValue } from '../../../core/numeric.js';

const FS = 1000; // sampling rate (Hz)
const PHI2 = 1.0; // second-tone phase (rad) — avoids coherent addition
const DB_FLOOR = -120;
const KPAD = 16; // fixed padding for the window-kernel view
const KBINS = 12; // kernel view span (bins of Fs/N)

/** |FFT(x zero-padded to nfft)| — returns the magnitude of bins 0..nfft/2. */
function magSpectrum(x, nfft) {
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  re.set(x);
  fft(re, im);
  const nh = nfft / 2;
  const mag = new Float64Array(nh + 1);
  for (let k = 0; k <= nh; k++) mag[k] = Math.hypot(re[k], im[k]);
  return { mag, re, im };
}

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

  const { mag, re, im } = magSpectrum(xw, nfft);

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
  const { mag: km } = magSpectrum(w, kfft);
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
        meta: { label: 'lobes secondaires', unit: 'dB', precision: 1 },
      },
      binWidth: {
        value: FS / N,
        meta: { label: 'largeur de raie Fs/N', unit: 'Hz', precision: 2 },
      },
    },
  };
}
