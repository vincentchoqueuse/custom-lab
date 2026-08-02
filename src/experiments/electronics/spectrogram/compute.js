// Short-time Fourier transform of three canonical sources — a linear chirp
// (whose end frequency may exceed Nyquist: the ridge folds), a pair of
// close tones, and an AM signal. The window length N is THE parameter:
//   Δf = Fs/N   and   Δt = N/Fs,   so   Δf · Δt = 1  (Gabor tradeoff)
// The hop adapts to keep ~220 columns whatever N. The map is stored in dB
// (0 = global max, floored at −80). The per-column ridge (argmax) and the
// spectral slice at t = tcut feed the checks and the companion views.
// Exact identity used by check.js: per-frame Parseval through the FFT.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { fft } from '../../../core/numeric.js';

const FS = 2000; // sampling rate (Hz)
const T = 2; // duration (s)
const NS = FS * T;
const COLS = 220; // target column count (hop adapts to N)
const DB_FLOOR = -80;
const F0 = 100; // chirp start frequency (Hz)
const FA = 300; // first tone (Hz)
const FC = 400; // AM carrier (Hz)
const AM_DEPTH = 0.8;
const ZOOM = 0.05; // half-width of the time-view zoom around tcut (s)

/** Instantaneous sample of each source (phase integrated in closed form). */
function sourceValue(source, p, t) {
  if (source === 'tones') {
    return Math.sin(2 * Math.PI * FA * t) + Math.sin(2 * Math.PI * (FA + p.df) * t);
  }
  if (source === 'am') {
    return (1 + AM_DEPTH * Math.sin(2 * Math.PI * p.fm * t)) * Math.sin(2 * Math.PI * FC * t);
  }
  // linear chirp: f(t) = F0 + (f1 − F0)·t/T, phase = 2π(F0·t + (f1−F0)t²/2T)
  return Math.sin(2 * Math.PI * (F0 * t + ((p.f1 - F0) * t * t) / (2 * T)));
}

/**
 * @param {{source: string, f1: number, df: number, fm: number, N: number,
 *          win: string, tcut: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ source, f1, df, fm, N, win, tcut }) {
  const p = { f1, df, fm };
  const x = new Float64Array(NS);
  for (let i = 0; i < NS; i++) x[i] = sourceValue(source, p, i / FS);

  const w = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    w[n] = win === 'rect' ? 1 : 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / N);
  }

  const hop = Math.max(8, Math.round((NS - N) / COLS));
  const cols = Math.floor((NS - N) / hop) + 1;
  const rows = N / 2 + 1;

  const mag = new Float64Array(rows * cols); // linear magnitudes, column-major
  const tCols = new Float64Array(cols); // frame CENTER times
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  let maxMag = 0;
  let parsevalGap = 0;

  for (let c = 0; c < cols; c++) {
    const start = c * hop;
    let frameEnergy = 0;
    for (let n = 0; n < N; n++) {
      re[n] = x[start + n] * w[n];
      frameEnergy += re[n] * re[n];
      im[n] = 0;
    }
    fft(re, im);
    let specEnergy = 0;
    for (let k = 0; k < N; k++) specEnergy += re[k] * re[k] + im[k] * im[k];
    if (frameEnergy > 0) {
      parsevalGap = Math.max(
        parsevalGap,
        Math.abs(frameEnergy - specEnergy / N) / frameEnergy
      );
    }
    for (let k = 0; k < rows; k++) {
      const m = Math.hypot(re[k], im[k]);
      mag[c * rows + k] = m;
      if (m > maxMag) maxMag = m;
    }
    tCols[c] = (start + N / 2) / FS;
  }

  // dB map (0 dB = global max) + per-column ridge
  const db = new Float64Array(rows * cols);
  const ridge = new Float64Array(cols);
  const binHz = FS / N;
  for (let c = 0; c < cols; c++) {
    let best = 0;
    for (let k = 0; k < rows; k++) {
      const m = mag[c * rows + k];
      db[c * rows + k] = Math.max(DB_FLOOR, 20 * Math.log10(m / maxMag + 1e-300));
      if (m > mag[c * rows + best]) best = k;
    }
    ridge[c] = best * binHz;
  }

  // spectral slice at the column nearest tcut
  let cCut = 0;
  for (let c = 1; c < cols; c++) {
    if (Math.abs(tCols[c] - tcut) < Math.abs(tCols[cCut] - tcut)) cCut = c;
  }
  const freqs = new Float64Array(rows);
  const sliceDb = new Float64Array(rows);
  for (let k = 0; k < rows; k++) {
    freqs[k] = k * binHz;
    sliceDb[k] = db[cCut * rows + k];
  }

  // time zoom around tcut (full resolution — the local oscillation is the point)
  const i0 = Math.max(0, Math.round((tcut - ZOOM) * FS));
  const i1 = Math.min(NS - 1, Math.round((tcut + ZOOM) * FS));
  const zt = new Float64Array(i1 - i0 + 1);
  const zx = new Float64Array(i1 - i0 + 1);
  for (let i = i0; i <= i1; i++) {
    zt[i - i0] = i / FS;
    zx[i - i0] = x[i];
  }

  return {
    observables: {
      spectro: { data: db, rows, cols, tMin: tCols[0], tMax: tCols[cols - 1], fMax: FS / 2 },
      ridge: { x: tCols, y: ridge },
      slice: { x: freqs, y: sliceDb },
      zoom: { x: zt, y: zx },
      parsevalGap, // checks
      nyquist: FS / 2, // hline in the slice view
      fRes: { value: binHz, meta: { label: 'Δf = Fs/N', unit: 'Hz', precision: 2 } },
      tRes: {
        value: (N / FS) * 1000,
        meta: { label: 'Δt = N/Fs', unit: 'ms', precision: 1 },
      },
    },
  };
}
