// Short-time Fourier transform of four canonical sources — a linear chirp
// (whose end frequency may exceed Nyquist: the ridge folds), a pair of
// close tones, an AM signal, and a chirp SUMMED with a frequency-modulated
// tone — a straight ridge and a sinusoidal one crossing in the same picture,
// which is what a time-frequency map is for and what no spectrum can show. The window length N is THE parameter:
//   Δf = Fs/N   and   Δt = N/Fs,   so   Δf · Δt = 1  (Gabor tradeoff)
// The hop adapts to keep ~220 columns whatever N. The map is stored in dB
// (0 = global max, floored at −80). The per-column ridge (argmax) and the
// spectral slice at t = tcut feed the checks and the companion views.
// Exact identity used by check.js: per-frame Parseval through the FFT.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { fft, toDb, windowValue } from '../../../core/numeric.js';

const FS = 2000; // sampling rate (Hz)
const T = 2; // duration (s)
const NS = FS * T;
const COLS = 220; // target column count (hop adapts to N)
const DB_FLOOR = -80;
const F0 = 100; // chirp start frequency (Hz)
const FA = 300; // first tone (Hz)
const FC = 400; // AM carrier (Hz)
const AM_DEPTH = 0.8;
const F_FM = 500; // carrier of the frequency-modulated tone (Hz)
const ZOOM = 0.05; // half-width of the time-view zoom around tcut (s)

/** Instantaneous sample of each source (phase integrated in closed form). */
function sourceValue(source, p, t) {
  if (source === 'tones') {
    return Math.sin(2 * Math.PI * FA * t) + Math.sin(2 * Math.PI * (FA + p.df) * t);
  }
  if (source === 'am') {
    return (1 + AM_DEPTH * Math.sin(2 * Math.PI * p.fm * t)) * Math.sin(2 * Math.PI * FC * t);
  }
  const chirp = Math.sin(2 * Math.PI * (F0 * t + ((p.f1 - F0) * t * t) / (2 * T)));
  if (source === 'fm') {
    // f_inst(t) = F_FM + Δ·sin(2π f_m t) ⇒ the phase integrates in closed form
    // to −(Δ/f_m)·cos(2π f_m t): the ridge is a sine of excursion ±Δ around
    // F_FM, crossed by the chirp's straight line.
    const beta = p.fdev / p.fmod; // modulation index
    return (
      0.9 * chirp +
      Math.sin(2 * Math.PI * F_FM * t - beta * Math.cos(2 * Math.PI * p.fmod * t))
    );
  }
  // linear chirp: f(t) = F0 + (f1 − F0)·t/T, phase = 2π(F0·t + (f1−F0)t²/2T)
  return chirp;
}

/**
 * @param {{source: string, f1: number, df: number, fm: number, fdev: number,
 *          fmod: number, N: number, win: string, tcut: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ source, f1, df, fm, fmod, fdev, N, win, tcut }) {
  const p = { f1, df, fm, fmod, fdev };
  const x = new Float64Array(NS);
  const tFull = new Float64Array(NS);
  for (let i = 0; i < NS; i++) {
    tFull[i] = i / FS;
    x[i] = sourceValue(source, p, tFull[i]);
  }

  const w = new Float64Array(N);
  for (let n = 0; n < N; n++) w[n] = windowValue(win, n, N);

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
    // Cette boucle de trames garde ses tampons `re`/`im` alloués UNE fois et
    // les réutilise : passer par core/dsp.js allouerait deux Float64Array par
    // trame, soit des centaines par calcul. La couche d'appels sert la
    // lisibilité d'un compute, pas les boucles chaudes — et c'est le seul
    // endroit du catalogue où l'arbitrage penche de ce côté.
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
      db[c * rows + k] = toDb(m / maxMag, DB_FLOOR);
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

  /* ---------- the two readings the spectrogram exists to improve on ------ */
  // The whole signal in time, and the whole record's spectrum. This is the
  // comparison that MOTIVATES the STFT rather than illustrating it: the time
  // plot says when something happens and nothing about what; the spectrum
  // says what frequencies are present and nothing about when. A chirp and
  // the same tones played in the reverse order have the SAME spectrum. Only
  // the map has both, and it pays the Gabor price for it.
  //
  // Always Hann, whatever the analysis window: this is not an STFT frame,
  // it is the reference the frames are judged against, and it should not
  // move when N or `win` move.
  const NFULL = 4096; // ≥ NS = 4000, and the FFT is radix-2
  const fr = new Float64Array(NFULL);
  const fi = new Float64Array(NFULL);
  for (let i = 0; i < NS; i++) fr[i] = x[i] * windowValue('hann', i, NS);
  fft(fr, fi);
  const fullRows = NFULL / 2 + 1;
  const fullBin = FS / NFULL;
  const fullF = new Float64Array(fullRows);
  const fullMag = new Float64Array(fullRows);
  let fullMax = 0;
  for (let k = 0; k < fullRows; k++) {
    fullF[k] = k * fullBin;
    fullMag[k] = Math.hypot(fr[k], fi[k]);
    if (fullMag[k] > fullMax) fullMax = fullMag[k];
  }
  const fullDb = new Float64Array(fullRows);
  for (let k = 0; k < fullRows; k++) fullDb[k] = toDb(fullMag[k] / fullMax, DB_FLOOR);

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
      signal: { x: tFull, y: x },
      spectrum: { x: fullF, y: fullDb },
      slice: { x: freqs, y: sliceDb },
      zoom: { x: zt, y: zx },
      tCut: tcut, // vline: where the slice and the zoom are taken, on the signal
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
