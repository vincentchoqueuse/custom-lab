// Estimating a spectrum from a NOISY record — and discovering that the obvious
// method does not work.
//
// The periodogram P(f) = |X(f)|²/(Fs·Σw²) is the natural estimator of the power
// spectral density. It has a property everyone assumes and nobody verifies:
//
//   IT IS NOT CONSISTENT. Its variance DOES NOT DECREASE with N.
//
// On white noise every point of the periodogram follows a σ⁴·χ²₂/2
// distribution: its standard deviation EQUALS its mean, whatever the number of
// samples. Multiplying N by sixteen divides the width of the lines by sixteen
// and does not quiet the grass by one decibel — one gets sixteen times more
// points, just as noisy. That is the counter-intuitive result of the whole
// chapter, and it shows in a second: `stdRatio` stays glued to 1.
//
// What works is AVERAGING independent periodograms, paying in resolution:
//
//   BARTLETT  K disjoint segments of length L, averaged. Variance / K,
//             resolution Fs/L instead of Fs/N.
//   WELCH     same segments, overlapped 50 % and windowed. At equal segment
//             length one gets nearly twice as many, hence less variance for the
//             same resolution — the overlap recovers the information the window
//             attenuates at the edges.
//
// The signal is two sinusoids in noise: a strong one, and a WEAK one being
// looked for. It is lost in two distinct ways, and they must be named separately
// in class — under the grass of the noise (that is the variance, which Welch
// cures) or under the sidelobes of its neighbour (that is the leakage, which
// only the window cures).
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { fft, windowValue, dbToLin } from '../../../core/numeric.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const FS = 1000; // Hz
const F1 = 150; // strong line (Hz)
const DB_FLOOR = -120;
// The strong line is at 150 Hz and the maximum gap is 200 Hz: above 400 Hz
// there is never a line, whatever the scene. That is where the fluctuation of
// the estimator is measured.
const MEAS_LO = 400;

/**
 * dB of a POWER: 10·log10, not 20.
 *
 * `core/numeric.js` exposes `toDb`, which is 20·log10 — the AMPLITUDE
 * convention, correct everywhere else in the catalogue because it is applied
 * there to moduli |X|. A spectral density is already a power: passing it through
 * that silently doubled every decibel of the experiment, and the gap between the
 * two lines showed 2·A₂ instead of A₂. The check "the weak line is exactly A₂ dB
 * below the strong one" exists so that this cannot happen again.
 */
const powerDb = (v) => Math.max(DB_FLOOR, 10 * Math.log10(v + 1e-300));

/**
 * Averaged periodogram of a record.
 *
 * DENSITY normalization: P = |X|² / (Fs · Σw²). It is the one that makes
 * E[P] = σ²/Fs on white noise of variance σ², independently of the window and of
 * the length — hence the one whose exact value can be verified rather than its
 * shape.
 *
 * @param {Float64Array} x  the record
 * @param {number} L        segment length (a power of 2)
 * @param {number} hop      shift between segments (L = disjoint, L/2 = 50 %)
 * @param {string} win      window applied to each segment
 * @returns {{f: Float64Array, psd: Float64Array, segments: number}}
 */
export function averagedPeriodogram(x, L, hop, win) {
  const rows = L / 2 + 1;
  const psd = new Float64Array(rows);
  const w = new Float64Array(L);
  let wSum2 = 0;
  for (let n = 0; n < L; n++) {
    w[n] = windowValue(win, n, L);
    wSum2 += w[n] * w[n];
  }
  const re = new Float64Array(L);
  const im = new Float64Array(L);
  let segments = 0;
  for (let start = 0; start + L <= x.length; start += hop) {
    for (let n = 0; n < L; n++) {
      re[n] = x[start + n] * w[n];
      im[n] = 0;
    }
    fft(re, im);
    for (let k = 0; k < rows; k++) psd[k] += re[k] * re[k] + im[k] * im[k];
    segments++;
  }
  const norm = FS * wSum2 * segments;
  for (let k = 0; k < rows; k++) psd[k] /= norm;
  const f = new Float64Array(rows);
  for (let k = 0; k < rows; k++) f[k] = (k * FS) / L;
  return { f, psd, segments };
}

/** Effective segment length and shift for each method. */
export function segmentation(method, N, L) {
  if (method === 'raw') return { L: N, hop: N };
  const eff = Math.min(L, N);
  return { L: eff, hop: method === 'welch' ? eff / 2 : eff };
}

/**
 * Relative fluctuation of the estimator, measured OVER A BAND WITH NO LINE.
 * This is the number that carries the whole lesson: ≈ 1 for the raw periodogram
 * whatever N, ≈ 1/√K after averaging K segments.
 *
 * The band, and not a guard of a few bins around the lines: a guard in BINS
 * shrinks in hertz as N grows, so much so that the leakage of the strong line
 * entered the measurement and made the number drift from 1.03 to 2.05 as the
 * record was lengthened — exactly the opposite of the conclusion the experiment
 * teaches, and for a reason that had nothing to do with the estimator. Measured
 * over [MEAS_LO, Fs/2], where no line can fall, the result matches a noise-only
 * reference to within 2 % across the whole parameter range, rectangular window
 * and 40 dB SNR included.
 */
export function fluctuation(f, psd, fLo = MEAS_LO) {
  let s = 0;
  let s2 = 0;
  let n = 0;
  for (let k = 1; k < f.length - 1; k++) {
    if (f[k] < fLo) continue;
    s += psd[k];
    s2 += psd[k] * psd[k];
    n++;
  }
  if (n < 2) return { mean: NaN, ratio: NaN, n };
  const mean = s / n;
  const varr = Math.max(s2 / n - mean * mean, 0);
  return { mean, ratio: Math.sqrt(varr) / mean, n };
}

/**
 * @param {{method: string, win: string, N: number, L: number, snr: number,
 *          a2: number, df: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ method, win, N, L, snr, a2, df, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  // σ is set by the SNR of the STRONG line: power A₁²/2 = 0.5
  const sigma = Math.sqrt(0.5 / dbToLin(snr));
  const f2 = F1 + df;
  // A₂ is a level in dB, hence a ratio of POWERS: the amplitude is its square
  // root. dbToLin returns 10^(dB/10), a power — using it as an amplitude pushed
  // the line down by 2·A₂ dB instead of A₂, and at −20 dB it came out 0.6 dB
  // from the floor instead of 20 dB below its neighbour. The check "the weak
  // line is A₂ dB below the strong one" pins it.
  const a2Lin = Math.sqrt(dbToLin(a2));

  const t = new Float64Array(N);
  const x = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    t[i] = i / FS;
    x[i] =
      Math.sin(2 * Math.PI * F1 * t[i]) +
      a2Lin * Math.sin(2 * Math.PI * f2 * t[i]) +
      sigma * gauss();
  }

  /* ---------- the chosen estimator, with the raw periodogram behind ------- */
  const seg = segmentation(method, N, L);
  const est = averagedPeriodogram(x, seg.L, seg.hop, win);
  // always computed, always drawn in grey: it is the point of comparison, and
  // "look at what Welch does to that grass" can only be said while seeing it
  const raw = averagedPeriodogram(x, N, N, win);

  const noiseLevel = (sigma * sigma) / FS; // E[P] on white noise
  const fl = fluctuation(est.f, est.psd);
  const flRaw = fluctuation(raw.f, raw.psd);

  const toDbArr = (a) => Float64Array.from(a, powerDb);

  /* ---------- the 1/√K law, swept ----------------------------------------- */
  // The same measurement repeated for shorter and shorter segments: this is the
  // view that turns "averaging reduces the variance" into a line of slope −1/2
  // on a log-log plot.
  const ks = [];
  const ratios = [];
  const theory = [];
  for (let Ls = N; Ls >= 32; Ls /= 2) {
    const s = segmentation(method === 'raw' ? 'bartlett' : method, N, Ls);
    const e = averagedPeriodogram(x, s.L, s.hop, win);
    if (e.segments < 1) continue;
    const r = fluctuation(e.f, e.psd);
    if (!Number.isFinite(r.ratio) || r.n < 8) continue;
    ks.push(e.segments);
    ratios.push(r.ratio);
    theory.push(1 / Math.sqrt(e.segments));
  }
  const order = ks.map((_, i) => i).sort((i, j) => ks[i] - ks[j]);

  /* ---------- the segmentation, drawn ------------------------------------- */
  // The windows themselves, laid where they fall. Several traces in a single
  // series, separated by NaNs: the generic plot breaks the path on a NaN, so no
  // bespoke view for a plate of spaghetti.
  //
  // And above all THE SUM of the shifted windows, which tells the four cases at
  // a glance and explains all the rest of the experiment:
  //
  //   rect  disjoint   sum = 1 everywhere   every sample counted once
  //   Hann  disjoint   sum ripples 0…1      the EDGES of the segments are
  //                                          nearly thrown away — that is the
  //                                          information the overlap will
  //                                          recover
  //   Hann  50 %       sum = 1 everywhere   perfect reconstruction (COLA):
  //                                          total weight 1 for all, and nearly
  //                                          independent segments
  //   rect  50 %       sum = 2 everywhere   every sample counted TWICE, with no
  //                                          attenuation: hence the correlated
  //                                          segments and the 20 % of variance
  //                                          Welch loses with a rectangular
  //                                          window
  const SHOW = 6; // segments drawn — beyond that the drawing says nothing
  const shown = Math.min(SHOW, est.segments);
  const zoomEnd = Math.min(N, (shown - 1) * seg.hop + seg.L);
  const wShape = new Float64Array(seg.L);
  for (let n = 0; n < seg.L; n++) wShape[n] = windowValue(win, n, seg.L);

  const wx = [];
  const wy = [];
  for (let s = 0; s < shown; s++) {
    const start = s * seg.hop;
    for (let n = 0; n < seg.L; n++) {
      wx.push((start + n) / FS);
      wy.push(wShape[n]);
    }
    wx.push(NaN); // separates this segment from the next
    wy.push(NaN);
  }

  // the sum, over ALL segments, restricted to the drawn window
  const sum = new Float64Array(zoomEnd);
  for (let s = 0; s < est.segments; s++) {
    const start = s * seg.hop;
    if (start >= zoomEnd) break;
    for (let n = 0; n < seg.L; n++) {
      const i = start + n;
      if (i < zoomEnd) sum[i] += wShape[n];
    }
  }
  const sx = new Float64Array(zoomEnd);
  for (let i = 0; i < zoomEnd; i++) sx[i] = i / FS;
  // the INTERIOR regime: the first and last segments have no neighbour on one
  // side, so their edge is not meant to be compensated
  let wMin = Infinity;
  let wMax = -Infinity;
  for (let i = seg.L; i < zoomEnd - seg.L; i++) {
    wMin = Math.min(wMin, sum[i]);
    wMax = Math.max(wMax, sum[i]);
  }
  const flat = Number.isFinite(wMin) && wMax - wMin < 1e-9;

  // the signal, restricted to the same range and rescaled to the windows: it is
  // there for context, not to be read on the ordinate
  const zx = new Float64Array(zoomEnd);
  const zy = new Float64Array(zoomEnd);
  let amp = 1e-12;
  for (let i = 0; i < zoomEnd; i++) amp = Math.max(amp, Math.abs(x[i]));
  for (let i = 0; i < zoomEnd; i++) {
    zx[i] = i / FS;
    zy[i] = x[i] / amp;
  }

  return {
    observables: {
      signal: { x: t, y: x },
      psd: { x: est.f, y: toDbArr(est.psd) },
      psdRaw: { x: raw.f, y: toDbArr(raw.psd) },
      noiseFloor: powerDb(noiseLevel), // hline: the true level σ²/Fs
      f1: F1, // vline: the strong line
      f2, // vline: the weak line, the one being looked for
      fluctVsK: {
        x: Float64Array.from(order, (i) => ks[i]),
        y: Float64Array.from(order, (i) => ratios[i]),
      },
      fluctTheory: {
        x: Float64Array.from(order, (i) => ks[i]),
        y: Float64Array.from(order, (i) => theory[i]),
      },
      // the segmentation
      segWindows: { x: Float64Array.from(wx), y: Float64Array.from(wy) },
      windowSum: { x: sx, y: sum },
      zoomSignal: { x: zx, y: zy },
      shownSegments: shown,
      coverage: {
        value: flat
          ? wMin > 1.5
            ? `flat at ${wMin.toFixed(2)} — every sample counted twice`
            : 'flat at 1 — perfect overlap, every sample weighs 1'
          : `ripples from ${wMin.toFixed(2)} to ${wMax.toFixed(2)} — segment edges are underweighted`,
        meta: { label: 'sum of the windows' },
      },
      segments: { value: est.segments, meta: { label: 'segments averaged K' } },
      fRes: {
        value: FS / seg.L,
        meta: { label: 'resolution Fs/L', unit: 'Hz', precision: 2 },
      },
      stdRatio: {
        value: fl.ratio,
        meta: { label: 'fluctuation from bin to bin', precision: 3 },
      },
      stdRatioRaw: {
        value: flRaw.ratio,
        meta: { label: 'the same, without averaging', precision: 3 },
      },
      verdict: {
        value:
          est.segments === 1
            ? 'not consistent: σ/mean ≈ 1 whatever N'
            : `variance divided by ≈ ${est.segments}`,
        meta: { label: 'estimator' },
      },
    },
  };
}
