// Oversampling, step by step — and what each step does to the spectrum.
//
// The chain comes down to three gestures, and the experiment advances them one
// at a time on THE SAME TWO FIGURES: the time view and the spectrum. Watching
// two drawings one already knows move is worth more than discovering six new
// ones — and the step being a PARAMETER, every scene opens where the lecture has
// reached, with its URL.
//
//   1. THE SAMPLES, at Fs. Their spectrum is periodic with period Fs, so it is
//      drawn only over [0, Fs/2]: beyond that there is nothing to say about a
//      signal clocked at Fs.
//   2. ZERO-STUFFING: L−1 zeros are inserted between the samples. And the
//      spectrum DOES NOT CHANGE — X_up(f) = X(f), exactly, to machine precision.
//      That is the heart of the experiment, and it always surprises. What
//      changes is the sampling rate, hence the BAND one looks at: the copies
//      that lived out of band are now inside it, and they are called images.
//      The price is read on the amplitude: one sample in L is non-zero, so the
//      mean power is divided by L — the next filter will need a gain of L to
//      give it back.
//   3. THE INTERPOLATION FILTER, a windowed sinc with cutoff Fs/2 and gain L. It
//      erases the images and gives the amplitude back. Its kernel is EXACTLY 1
//      at the centre and 0 at the other multiples of L: the interpolated stream
//      therefore passes through the original samples without displacing them,
//      which the harness pins at 1e-12.
//
// No zero-order hold here: that is the ANALOG stage of the DAC, a
// autre histoire (son enveloppe en sinc, son affaissement en bord de bande),
// and mixing it into this one blurred both.
//
// PURE, stateless — runs in a worker; entirely deterministic (no draw).
import { fft, sinc } from '../../../core/numeric.js';
import { magSpectrum, freqAxis, dbAmpAll, peakNear, tone } from '../../../core/dsp.js';

const FS = 8000; // fréquence d'échantillonnage de départ (Hz)
const N_PLOT = 24; // échantillons de base tracés (3 ms)
const N_SPEC = 256; // échantillons de base analysés
const NFFT = 8192;
const DB_FLOOR = -90;

/**
 * Interpolation kernel: a windowed sinc. Three properties the whole chain
 * depends on — 1 at 0, 0 at the other multiples of L, DC gain L.
 */
export function interpKernel(L, half) {
  const taps = 2 * half + 1;
  const h = new Float64Array(taps);
  for (let k = 0; k < taps; k++) {
    const m = k - half;
    h[k] = sinc(m / L) * (0.5 + 0.5 * Math.cos((Math.PI * m) / (half + 1)));
  }
  return h;
}

/** Convolution linéaire, retard de groupe compensé. */
export function filterStream(up, h, half) {
  const n = up.length;
  const taps = h.length;
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    const kMin = Math.max(0, i + half - n + 1);
    const kMax = Math.min(taps - 1, i + half);
    for (let k = kMin; k <= kMax; k++) acc += h[k] * up[i + half - k];
    y[i] = acc;
  }
  return y;
}

/** |X(f)| en dB sur la grille NFFT, fenêtre de Hann, normalisé par `norm`. */
const spectrumDb = (sig, norm) =>
  dbAmpAll(
    magSpectrum(sig, { nfft: NFFT, window: 'hann' }).map((m) => m / norm),
    DB_FLOOR
  );

/**
 * @param {{f0: number, L: number, stage: string, half: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ f0, L, stage, half }) {
  const nSpec = N_SPEC * L;
  const nPlot = N_PLOT * L;
  const halfTaps = Math.max(1, Math.round(half) * L);

  const x = tone(N_SPEC, f0, { fs: FS });

  const up = new Float64Array(nSpec);
  for (let n = 0; n < N_SPEC; n++) up[n * L] = x[n];

  const h = interpKernel(L, halfTaps);
  const yUp = filterStream(up, h, halfTaps);

  /* ---------- temporel ---------------------------------------------------- */
  // Abscissa in milliseconds, THE SAME at all three steps: that is what makes
  // it visible that the signal does not move and only the grid tightens.
  const msBase = new Float64Array(N_PLOT);
  const vBase = new Float64Array(N_PLOT);
  for (let n = 0; n < N_PLOT; n++) {
    msBase[n] = (1000 * n) / FS;
    vBase[n] = x[n];
  }
  const msUp = new Float64Array(nPlot);
  const vStuffed = new Float64Array(nPlot);
  const vFiltered = new Float64Array(nPlot);
  for (let i = 0; i < nPlot; i++) {
    msUp[i] = (1000 * i) / (FS * L);
    vStuffed[i] = up[i];
    vFiltered[i] = yUp[i];
  }
  const nDense = nPlot * 8;
  const msDense = new Float64Array(nDense);
  const vDense = new Float64Array(nDense);
  for (let i = 0; i < nDense; i++) {
    const t = i / (FS * L * 8);
    msDense[i] = 1000 * t;
    vDense[i] = Math.sin(2 * Math.PI * f0 * t);
  }

  const empty = { x: new Float64Array(0), y: new Float64Array(0) };
  const stemsX = stage === 'samples' ? msBase : msUp;
  const stemsY = stage === 'samples' ? vBase : stage === 'stuffed' ? vStuffed : vFiltered;

  /* ---------- spectre ----------------------------------------------------- */
  // Common normalization: the top of the spectrum BEFORE filtering. The three
  // steps are therefore read on the same scale, and the amplitude recovery
  // brought by the filter's gain L shows instead of being masked by a
  // recadrage automatique.
  const ref = spectrumDb(up, 1);
  let peak = -Infinity;
  for (let k = 0; k <= NFFT / 2; k++) peak = Math.max(peak, ref[k]);
  const norm = 10 ** (peak / 20);

  const specStuffed = spectrumDb(up, norm);
  const specFiltered = spectrumDb(yUp, norm);

  const fx = freqAxis(NFFT, FS * L);

  // Step 1: the trace stops at Fs/2. A NaN cuts the curve — no need for another
  // view nor for a conditional layer.
  const specNow = new Float64Array(NFFT / 2 + 1);
  for (let k = 0; k <= NFFT / 2; k++) {
    const val = stage === 'filtered' ? specFiltered[k] : specStuffed[k];
    specNow[k] = stage === 'samples' && fx[k] > FS / 2 ? NaN : val;
  }

  // the filter response, same grid, gain brought back to 0 dB in band
  const hRe = new Float64Array(NFFT);
  const hIm = new Float64Array(NFFT);
  for (let k = 0; k < h.length; k++) hRe[k] = h[k] / L;
  fft(hRe, hIm);
  const respDb = new Float64Array(NFFT / 2 + 1);
  for (let k = 0; k <= NFFT / 2; k++) respDb[k] = dbAmpAll([Math.hypot(hRe[k], hIm[k])], DB_FLOOR)[0];

  /* ---------- what the room must be able to read -------------------------- */
  const levelAt = (spec, f) => peakNear(spec, f, { fs: FS * L, nfft: NFFT, width: 8 });
  const imageF = FS - f0; // the first image born of the zero-stuffing
  const imageStuffed = levelAt(specStuffed, imageF);
  const imageFiltered = levelAt(specFiltered, imageF);
  const bandFiltered = levelAt(specFiltered, f0);

  let worst = 0;
  for (let n = 0; n < N_SPEC; n++) {
    const i = n * L;
    if (i < yUp.length) worst = Math.max(worst, Math.abs(yUp[i] - x[n]));
  }

  return {
    observables: {
      stems: { x: stemsX, y: stemsY },
      baseSamples: { x: msBase, y: vBase },
      ideal: { x: msDense, y: vDense },
      filtered: stage === 'filtered' ? { x: msUp, y: vFiltered } : empty,

      spectrum: { x: fx, y: specNow },
      response: stage === 'filtered' ? { x: fx, y: respDb } : empty,
      nyquistBase: FS / 2,

      imageLevel: {
        value: stage === 'samples' ? NaN : stage === 'filtered' ? imageFiltered : imageStuffed,
        meta: { label: 'image at Fs − f₀', unit: 'dB', precision: 1 },
      },
      bandLevel: {
        // The gain given back by the filter, in dB above the zero-stuffed
        // stream. It is 20·log10(L) and not 0: the stuffing had divided the
        // power by L, and the kernel of DC gain L gives it back. It is the same
        // fact as the "power ÷ L" check, read off the figure instead of the
        // table.
        value: stage === 'filtered' ? bandFiltered : 0,
        meta: { label: 'gain restored (= 20·log₁₀ L)', unit: 'dB', precision: 2 },
      },
      rejection: {
        value: stage === 'filtered' ? imageStuffed - imageFiltered : NaN,
        meta: { label: 'filter rejection', unit: 'dB', precision: 1 },
      },
      interpErr: {
        value: stage === 'filtered' ? worst : NaN,
        meta: { label: 'gap to the original samples', precision: 6 },
      },
      nTaps: { value: h.length, meta: { label: 'coefficients' } },
      // raw levels, for the harness
      imgStuffedDb: imageStuffed,
      imgFilteredDb: imageFiltered,
    },
  };
}

export { FS, N_SPEC, NFFT };
