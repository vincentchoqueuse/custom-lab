// Beyond the Fourier resolution — and at what price.
//
// The periodogram does not separate two lines closer than Fs/N. That is no
// algorithmic defect: it is the consequence of a MINIMAL assumption, that of
// assuming nothing about the signal. High-resolution methods do the opposite —
// they POSTULATE a model, "d complex exponentials in white noise" — and that
// postulate buys a resolution Fourier cannot reach. The whole experiment lies in
// the price of that bargain.
//
// The covariance R = E[x xᴴ] of such a signal has a very particular structure:
// its M eigenvalues split into d LARGE ones (the signal subspace) and M−d equal
// to σ² (the noise subspace). The noise eigenvectors are orthogonal to every
// exponential present, which gives three estimators:
//
//   MUSIC        sweeps 1/‖Eₙᴴa(f)‖²: where a(f) falls into the signal, the
//                denominator vanishes and the pseudo-spectrum explodes.
//   root-MUSIC   cancels the same denominator ALGEBRAICALLY: the roots of a
//                polynomial, hence no grid, hence no resolution limited by a
//                sweep step.
//   ESPRIT       does not even use the noise: the shift structure of the signal
//                subspace gives the frequencies by solving a linear system.
//
// And the price, which must be shown as much as the gain: d must be KNOWN.
// Getting it wrong does not degrade the estimation, it breaks it — d too small
// and a source disappears, d too large and phantom peaks appear. The parameter
// `d` is therefore front and centre, with the eigenvalue view that serves to
// choose it.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { noiseSigma } from '../../../core/dsp.js';
import { fft, toDb } from '../../../core/numeric.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import {
  covariance,
  hermitianEig,
  musicPseudo,
  rootMusic,
  esprit,
  lsAmplitudes,
} from '../_lib/subspace.js';
// the pinned framing, shared with the manifest (frame.js)
import { F_LO, F_HI, F_HI_FAR, MODEL_FLOOR } from '../_lib/frame.js';

const FS = 1000; // Hz
const F1 = 200; // first line (Hz)
const F3 = 330; // third line, plainly off to the side (Hz)
const NFFT = 4096; // grid of the reference periodogram
const NGRID = 1500; // grid of the pseudo-spectrum
const DB_FLOOR = -80;

/**
 * @param {{N: number, M: number, d: number, sources: number, df: number,
 *          snr: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ N, M, d, sources, df, snr, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  // The gap is expressed in units of the FOURIER LIMIT Fs/N: the only setting
  // that keeps its meaning when N changes, and it puts the point inside the
  // parameter itself — at 1 the periodogram just barely separates, below it
  // cannot any more, whatever one does.
  const fourier = FS / N;
  const f2 = F1 + df * fourier;
  const freqs = sources === 3 ? [F1, f2, F3] : [F1, f2];

  // CIRCULAR complex white noise: σ² per quadrature, hence 2σ² in total. The
  // reference power passed to noiseSigma is therefore 0.5 and not 1, for a line
  // of unit power — that is the factor 2 one does not notice going by when the
  // conversion is written by hand.
  const sigma = noiseSigma(0.5, snr);
  const xr = new Float64Array(N);
  const xi = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    for (const f of freqs) {
      const w = (2 * Math.PI * f * n) / FS;
      xr[n] += Math.cos(w);
      xi[n] += Math.sin(w);
    }
    xr[n] += sigma * gauss();
    xi[n] += sigma * gauss();
  }

  // THE SIGNAL ITSELF, which every other view of this experiment is an
  // ESTIMATE of. Two sinusoids in noise look like nothing at all in time —
  // that is the point, and it is the reason the whole method exists — so the
  // room should meet the raw record before being shown four different opinions
  // about what is in it. A window, because 512 samples of noise is texture and
  // not information; a line rather than stems, as in the OFDM frame, because
  // at this density a comb is black.
  const nShow = Math.min(N, 128);
  const tIdx = Float64Array.from({ length: nShow }, (_, i) => i);
  const sigI = xr.slice(0, nShow);
  const sigQ = xi.slice(0, nShow);

  /* ---------- the reference: the periodogram ------------------------------ */
  const pr = new Float64Array(NFFT);
  const pi = new Float64Array(NFFT);
  pr.set(xr.subarray(0, Math.min(N, NFFT)));
  pi.set(xi.subarray(0, Math.min(N, NFFT)));
  fft(pr, pi);
  const fLo = F_LO;
  const fHi = sources === 3 ? F_HI_FAR : F_HI;
  const pf = [];
  const py = [];
  let pMax = 0;
  const mags = new Float64Array(NFFT);
  for (let k = 0; k < NFFT; k++) {
    mags[k] = pr[k] * pr[k] + pi[k] * pi[k];
    if (mags[k] > pMax) pMax = mags[k];
  }
  for (let k = 0; k < NFFT; k++) {
    const f = (k * FS) / NFFT;
    if (f < fLo || f > fHi) continue;
    pf.push(f);
    py.push(toDb(Math.sqrt(mags[k] / pMax), DB_FLOOR));
  }

  /* ---------- the covariance and its eigenspectrum ------------------------ */
  const Meff = Math.min(M, Math.floor(N / 2));
  const R = covariance(xr, xi, Meff);
  const eig = hermitianEig(R.re, R.im, Meff);
  const dEff = Math.min(d, Meff - 1);

  const evIdx = new Float64Array(Meff);
  const evDb = new Float64Array(Meff);
  const top = Math.max(eig.values[0], 1e-300);
  for (let k = 0; k < Meff; k++) {
    evIdx[k] = k + 1;
    evDb[k] = toDb(Math.sqrt(Math.max(eig.values[k], 0) / top), DB_FLOOR);
  }
  // the d kept as signal, highlighted
  const selIdx = new Float64Array(dEff);
  const selDb = new Float64Array(dEff);
  for (let k = 0; k < dEff; k++) {
    selIdx[k] = k + 1;
    selDb[k] = evDb[k];
  }
  // the theoretical noise level σ², and the jump measured at the cutoff.
  // 2σ² and not σ²: the noise is circular complex and carries σ² PER
  // QUADRATURE, hence a total power of 2σ². That is the level the plateau sits
  // at, and the check pins it against the mean of the plateau.
  const noisePow = 2 * sigma * sigma;
  const noiseDb = toDb(Math.sqrt(Math.max(noisePow, 1e-300) / top), DB_FLOOR);
  const gapDb = dEff < Meff ? evDb[dEff - 1] - evDb[dEff] : NaN;

  /* ---------- MUSIC, root-MUSIC, ESPRIT ---------------------------------- */
  const grid = new Float64Array(NGRID);
  for (let k = 0; k < NGRID; k++) grid[k] = (fLo + ((fHi - fLo) * k) / (NGRID - 1)) / FS;
  const ps = musicPseudo(eig, Meff, dEff, grid);
  let psMax = 0;
  for (let k = 0; k < NGRID; k++) if (ps[k] > psMax) psMax = ps[k];
  const gf = new Float64Array(NGRID);
  const gy = new Float64Array(NGRID);
  for (let k = 0; k < NGRID; k++) {
    gf[k] = grid[k] * FS;
    gy[k] = toDb(Math.sqrt(ps[k] / psMax), DB_FLOOR);
  }

  const rm = rootMusic(eig, Meff, dEff);
  const es = esprit(eig, Meff, dEff);
  const toHz = (a) => Float64Array.from(a, (v) => v * FS);
  const rmHz = toHz(rm);
  const esHz = toHz(es);

  // The estimates, laid on the pseudo-spectrum at a fixed height: they are
  // NUMBERS, not curves, and seeing them land (or not) on the truth verticals is
  // the whole reading of the view.
  const marks = (hz, y) => ({
    x: Float64Array.from(hz),
    y: Float64Array.from(hz, () => y),
  });

  /* ---------- the full MODEL: frequencies + amplitudes + noise ------------ */
  // Subspace methods return FREQUENCIES and nothing else. As long as one stops
  // there, one knows where the lines are without knowing what they are worth —
  // so one can neither reconstruct the signal nor say whether the model explains
  // what was measured. Once the frequencies are known the model becomes LINEAR
  // in its amplitudes, and a d × d least squares returns them. BOTH estimators,
  // not one picked: the view shows them side by side with the truth, in the same
  // representation, and it is that identity of form which allows comparing them
  // at a glance rather than translating mentally from one drawing to another.
  const lsRoot = lsAmplitudes(xr, xi, rm);
  const lsEsprit = lsAmplitudes(xr, xi, es);

  // Two INDEPENDENT estimates of the noise variance, which must agree: the
  // model residual ‖x − Va‖²/N, and the mean of the eigenvalue plateau. Two
  // routes that agree are worth more than one route taken on trust — the harness
  // verifies the agreement.
  let plateau = 0;
  let nPlateau = 0;
  for (let k = dEff; k < Meff; k++) {
    plateau += eig.values[k];
    nPlateau++;
  }
  plateau = nPlateau ? plateau / nPlateau : NaN;

  const dbP = (v) => (v > 0 ? 10 * Math.log10(v) : DB_FLOOR);
  const MODEL_FLOOR = -60; // floor of the "estimated spectrum" view

  // THREE spectra, all in the SAME representation: stems for the sinusoids, a
  // line for the noise level. A line spectrum is discrete — a continuous stroke
  // would claim something happens between the lines — and giving the truth the
  // shape of the estimates is what allows comparing them at a glance. When all
  // is well the three coincide: that is the result, not a legibility defect.
  const lineSpec = (hz, power) => ({
    x: Float64Array.from(hz),
    y: Float64Array.from(power, (pw) => Math.max(dbP(pw), MODEL_FLOOR)),
  });
  const linesTrue = lineSpec(freqs, freqs.map(() => 1)); // amplitude 1 → 0 dB
  const linesRoot = lineSpec(Array.from(rm, (f) => f * FS), lsRoot.power);
  const linesEsprit = lineSpec(Array.from(es, (f) => f * FS), lsEsprit.power);

  /** worst amplitude gap, in dB, over the lines actually matched */
  const ampErrOf = (hz, power) => {
    let worst = 0;
    for (let k = 0; k < hz.length; k++) {
      const near = Math.min(...freqs.map((f) => Math.abs(hz[k] * FS - f)));
      if (near < 5) worst = Math.max(worst, Math.abs(dbP(power[k])));
    }
    return worst;
  };

  /** The noise floor as a rectangle: from the base of the frame up to the level. */
  const noiseBand = (levelDb) => ({
    x: Float64Array.of(fLo, fHi),
    lo: Float64Array.of(MODEL_FLOOR, MODEL_FLOOR),
    hi: Float64Array.of(levelDb, levelDb),
  });

  /** largest matching error, in Hz, between the estimates and the truth */
  const worstErr = (hz) => {
    if (hz.length === 0) return NaN;
    let worst = 0;
    for (const f of freqs.slice(0, dEff)) {
      let best = Infinity;
      for (const g of hz) best = Math.min(best, Math.abs(g - f));
      worst = Math.max(worst, best);
    }
    return worst;
  };

  /**
   * The error MATCHING DOES NOT SEE: for each estimate, the distance to the
   * nearest true frequency. `worstErr` looks at whether every true line was
   * found; this one looks at whether a frequency was INVENTED, which is the
   * failure mode of a d that is too large.
   *
   * It replaced a visual proof: now that the framing is pinned, a phantom line
   * at 840 Hz leaves the frame instead of stretching it. A figure that stays at
   * a hundredth of a hertz while the model is right and jumps to several hundred
   * as soon as it is not says the same thing, and says it even when the room is
   * not looking in the right place.
   */
  const strayHz = (hz) => {
    let worst = 0;
    for (const g of hz) {
      let best = Infinity;
      for (const f of freqs) best = Math.min(best, Math.abs(g - f));
      worst = Math.max(worst, best);
    }
    return hz.length ? worst : NaN;
  };

  return {
    observables: {
      /* --- the record, before any opinion about what is in it --- */
      sigI: { x: tIdx, y: sigI },
      sigQ: { x: tIdx, y: sigQ },

      periodogram: { x: Float64Array.from(pf), y: Float64Array.from(py) },
      eigenvalues: { x: evIdx, y: evDb },
      eigenSelected: { x: selIdx, y: selDb },
      pseudo: { x: gf, y: gy },
      rootMusicMarks: marks(rmHz, -3),
      espritMarks: marks(esHz, -8),
      // the true frequencies, as verticals on all three views
      fTrue1: F1,
      fTrue2: f2,
      fTrue3: sources === 3 ? F3 : NaN,
      noiseLine: noiseDb,
      dLine: dEff + 0.5, // vertical: the signal / noise cutoff
      fourierLimit: {
        value: fourier,
        meta: { label: 'Fourier limit Fs/N', unit: 'Hz', precision: 2 },
      },
      spacing: {
        value: f2 - F1,
        meta: { label: 'gap between the lines', unit: 'Hz', precision: 2 },
      },
      snapshots: { value: R.snapshots, meta: { label: 'snapshots' } },
      eigenGap: {
        value: gapDb,
        meta: { label: 'jump at the cutoff', unit: 'dB', precision: 1 },
      },
      errRoot: {
        value: worstErr(rmHz),
        meta: { label: 'root-MUSIC error', unit: 'Hz', precision: 3 },
      },
      errEsprit: {
        value: worstErr(esHz),
        meta: { label: 'ESPRIT error', unit: 'Hz', precision: 3 },
      },
      strayRoot: {
        value: strayHz(rmHz),
        meta: { label: 'root-MUSIC spurious', unit: 'Hz', precision: 2 },
      },
      strayEsprit: {
        value: strayHz(esHz),
        meta: { label: 'ESPRIT spurious', unit: 'Hz', precision: 2 },
      },
      // the three spectra, same shape: lines + noise level
      linesTrue,
      linesRoot,
      linesEsprit,
      nsTrue: dbP(2 * sigma * sigma),
      nsRoot: dbP(lsRoot.noise),
      nsEsprit: dbP(lsEsprit.noise),
      // The noise is a power SPREAD over the whole band, not a value at one
      // frequency: a rectangle says that, a line does not. The lines rise above
      // a floor, and that is exactly the model "d exponentials PLUS white
      // noise" being validated. The upper edge is still drawn on top, because a
      // translucent wash cannot be read to the decibel.
      bandTrue: noiseBand(dbP(2 * sigma * sigma)),
      bandRoot: noiseBand(dbP(lsRoot.noise)),
      bandEsprit: noiseBand(dbP(lsEsprit.noise)),
      modelFloor: MODEL_FLOOR,
      noiseRoot: {
        value: dbP(lsRoot.noise),
        meta: { label: 'noise — root-MUSIC', unit: 'dB', precision: 2 },
      },
      noiseEsprit: {
        value: dbP(lsEsprit.noise),
        meta: { label: 'noise — ESPRIT', unit: 'dB', precision: 2 },
      },
      noiseEigen: {
        value: dbP(plateau),
        meta: { label: 'noise — eigenvalues', unit: 'dB', precision: 2 },
      },
      noiseRef: {
        value: dbP(2 * sigma * sigma),
        meta: { label: 'true noise', unit: 'dB', precision: 2 },
      },
      ampErrRoot: {
        value: ampErrOf(rm, lsRoot.power),
        meta: { label: 'amplitude error — root-MUSIC', unit: 'dB', precision: 2 },
      },
      ampErrEsprit: {
        value: ampErrOf(es, lsEsprit.power),
        meta: { label: 'amplitude error — ESPRIT', unit: 'dB', precision: 2 },
      },
      model: {
        value:
          dEff === sources
            ? `d = ${dEff} = number of sources`
            : dEff < sources
              ? `d = ${dEff} < ${sources} sources: one is missing`
              : `d = ${dEff} > ${sources} sources: phantom peaks`,
        meta: { label: 'model' },
      },
    },
  };
}
