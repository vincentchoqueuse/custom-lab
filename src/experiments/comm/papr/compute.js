// PAPR OF AN OFDM SYMBOL, and why the number depends on how you look.
//
// An OFDM symbol is a sum of N independently modulated carriers. Most of the
// time they interfere every which way and the envelope is noise-like; now and
// then they line up and the envelope spikes. The peak-to-average power ratio
//
//     PAPR = max |x(t)|² / E|x(t)|²
//
// is what a power amplifier has to survive, and it is the reason OFDM needs an
// expensive one.
//
// THE MEASUREMENT DEPENDS ON THE SAMPLING RATE, which is the whole subject
// here. The IFFT gives N samples per symbol; the transmitted signal is
// continuous, and its peak generally falls BETWEEN two of them. Reading the
// PAPR off the critically sampled sequence therefore under-reports it — by
// nearly 2 dB at N = 64 — and a link budget built on that number is short by
// exactly that much. Oversampling by L (zero-padding the spectrum before a
// longer IFFT) recovers the peaks, and saturates: L = 4 is within about a
// tenth of a dB of the continuous-time answer, which is the practical rule.
//
// THE MODEL. For N large the CLT makes x[n] a complex Gaussian, so |x[n]|² is
// exponential with unit mean, and the critically sampled PAPR is the maximum
// of N independent exponentials:
//
//     P(PAPR ≤ γ) = (1 − e^{−γ})^N      and      E[PAPR] = H_N = Σ_{k≤N} 1/k
//
// exactly — the Nth harmonic number, not an asymptotic. That is the theory
// curve, and it says the thing worth taking away: the typical PAPR grows like
// ln N while the WORST case grows like N. At N = 1024 that is 8.9 dB against
// 30.1 dB. PAPR is a tail problem, never a worst-case one.
//
// Oversampled, the samples are correlated and the maximum of them is larger.
// There is no closed form; the standard fit (van Nee & Prasad) keeps the same
// expression with an EFFECTIVE 2.8 N samples, and this compute draws it as
// what it is — a fit that the measurement is allowed to disagree with.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32 } from '../../../core/rng.js';
import { ifft } from '../../../core/dsp.js';
import { constellation } from '../_lib/modulation.js';

/** The stand-in for continuous time on the envelope view. */
const L_FINE = 32;
/** Critical-sample periods shown around the peak. */
const WIN = 16;
/** van Nee & Prasad: the oversampled CCDF fits the same expression with this
 *  many effective samples. An empirical constant, drawn as one. */
const ALPHA = 2.8;

/** Nth harmonic number — E[max of N iid Exp(1)], exactly. */
export function harmonic(n) {
  let s = 0;
  for (let k = 1; k <= n; k++) s += 1 / k;
  return s;
}

/** P(PAPR > γ) under the Gaussian model with `n` effective samples. */
export const ccdfTheory = (gamma, n) => 1 - (1 - Math.exp(-gamma)) ** n;

/** One OFDM symbol's worth of frequency-domain data, unit average energy. */
export function drawSymbol(N, mod, rng) {
  const pts = constellation(mod);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    const p = pts[Math.floor(rng() * pts.length) % pts.length];
    re[k] = p.x;
    im[k] = p.y;
  }
  return { re, im };
}

/**
 * The symbol in time, oversampled by L.
 *
 *     x_L[m] = (1/√N) Σ_k X_k e^{j2πkm/(LN)},   m = 0 … LN−1
 *
 * built by ZERO-PADDING THE MIDDLE of the spectrum — the positive frequencies
 * stay at the bottom, the negative ones at the top, and the zeros go where
 * Nyquist was. Any other placement interpolates a different signal.
 *
 * The scaling is the one that makes x_L[L·n] = x_1[n] EXACTLY: the oversampled
 * signal contains the critically sampled one, sample for sample, which is what
 * lets one transform answer every L at once and is checked as an identity.
 */
export function oversample(Xre, Xim, L) {
  const N = Xre.length;
  const n = L * N;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const half = N / 2;
  for (let k = 0; k < half; k++) {
    re[k] = Xre[k];
    im[k] = Xim[k];
    re[n - half + k] = Xre[half + k];
    im[n - half + k] = Xim[half + k];
  }
  ifft(re, im); // divides by n = L·N
  const s = L * Math.sqrt(N);
  for (let i = 0; i < n; i++) {
    re[i] *= s;
    im[i] *= s;
  }
  return { re, im };
}

/**
 * The symbol's average power, (1/N)Σ|X_k|².
 *
 * Read off the SPECTRUM and not off the samples, because Parseval makes the
 * two equal for every L and the spectrum costs nothing. On a constant-modulus
 * constellation it is exactly 1; on a 16-QAM the symbol's own average is what
 * PAPR is defined against, which is not quite 1 for any finite N.
 */
export function meanPower(Xre, Xim) {
  let p = 0;
  for (let k = 0; k < Xre.length; k++) p += Xre[k] ** 2 + Xim[k] ** 2;
  return p / Xre.length;
}

/** PAPR read off every `stride`-th sample — i.e. at oversampling L_fine/stride. */
export function paprAt(re, im, stride, pmean) {
  let peak = 0;
  for (let i = 0; i < re.length; i += stride) {
    const v = re[i] ** 2 + im[i] ** 2;
    if (v > peak) peak = v;
  }
  return peak / pmean;
}

const toDb = (v) => 10 * Math.log10(v);

/**
 * @param {{N: number, L: number, mod: string, M: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ N, L, mod, M, gamma, seed }) {
  const rng = mulberry32(seed);

  /* ---------- the main run: M symbols at the chosen (N, L) ---------------- */
  // One transform per symbol. The PAPR at L = 1 comes out of the SAME
  // transform by reading every Lth sample, so the two numbers the experiment
  // compares are always measured on one and the same signal — a second draw
  // would confound the sampling rate with the luck of the draw.
  const papr = new Float64Array(M);
  const paprCrit = new Float64Array(M);
  for (let s = 0; s < M; s++) {
    const X = drawSymbol(N, mod, rng);
    const pm = meanPower(X.re, X.im);
    const x = oversample(X.re, X.im, L);
    papr[s] = paprAt(x.re, x.im, 1, pm);
    paprCrit[s] = paprAt(x.re, x.im, L, pm);
  }

  const sorted = Float64Array.from(papr).sort();
  const mean = papr.reduce((a, b) => a + b, 0) / M;
  const meanCrit = paprCrit.reduce((a, b) => a + b, 0) / M;
  const pct = (q) => sorted[Math.min(M - 1, Math.floor(q * M))];

  /* ---------- the CCDF, against the two models --------------------------- */
  // LINEAR IN γ, and linear in probability, because the thing this experiment
  // is about is a RATIO — the peak is six times the average power — and a
  // decibel hides exactly that. "7 dB" is a number; "six times" is a problem,
  // and an amplifier is specified against the second.
  //
  // The ORDINATE stays logarithmic: a clipping probability is bought at one
  // symbol in a thousand, and a linear axis puts that on the floor. Only the
  // abscissa changes units, which is the one the pill sets.
  const gMax = Math.max(sorted[M - 1] * 1.05, 8);
  const G = 96;
  const gAx = new Float64Array(G);
  const ccdfEmp = new Float64Array(G);
  const ccdfN = new Float64Array(G);
  const ccdfAlpha = new Float64Array(G);
  for (let i = 0; i < G; i++) {
    const g = (gMax * i) / (G - 1);
    let above = 0;
    for (let s = 0; s < M; s++) if (papr[s] > g) above++;
    gAx[i] = g;
    // 1/M is the smallest frequency M symbols can express; below it the curve
    // would be reporting the absence of evidence as evidence
    ccdfEmp[i] = Math.max(above / M, 1 / M);
    ccdfN[i] = Math.max(ccdfTheory(g, N), 1e-12);
    ccdfAlpha[i] = Math.max(ccdfTheory(g, ALPHA * N), 1e-12);
  }

  // how often the pill's own threshold is crossed — the reading a designer
  // actually buys, at the level they actually chose
  let overGamma = 0;
  for (let s = 0; s < M; s++) if (papr[s] > gamma) overGamma++;

  /* ---------- one symbol, around its peak --------------------------------- */
  // The envelope at ×32 stands in for continuous time. The window is CENTRED
  // ON THE PEAK rather than on the origin: the peak is the subject, and at
  // N = 1024 the odds of it falling in the first sixteen sample periods are
  // sixteen in a thousand.
  const X0 = drawSymbol(N, mod, rng);
  const pm0 = meanPower(X0.re, X0.im);
  const fine = oversample(X0.re, X0.im, L_FINE);
  let peakIdx = 0;
  let peakVal = 0;
  for (let i = 0; i < fine.re.length; i++) {
    const v = fine.re[i] ** 2 + fine.im[i] ** 2;
    if (v > peakVal) {
      peakVal = v;
      peakIdx = i;
    }
  }
  const centre = Math.round(peakIdx / L_FINE); // in critical-sample periods
  const lo = Math.max(0, Math.min(N - WIN, centre - WIN / 2));
  // LINEAR power, in units of the symbol's own average: the peak is then six
  // times the mean and looks it, which "7.8 dB" never did.
  const at = (i) => (fine.re[i] ** 2 + fine.im[i] ** 2) / pm0;

  const envT = [];
  const envY = [];
  for (let n = lo * L_FINE; n <= (lo + WIN) * L_FINE && n < fine.re.length; n++) {
    envT.push(n / L_FINE);
    envY.push(at(n));
  }
  const critT = [];
  const critY = [];
  for (let n = lo; n <= lo + WIN && n < N; n++) {
    critT.push(n);
    critY.push(at(n * L_FINE));
  }
  const sampT = [];
  const sampY = [];
  for (let n = lo * L; n <= (lo + WIN) * L && n < L * N; n++) {
    sampT.push(n / L);
    sampY.push(at((n * L_FINE) / L));
  }

  // The two horizontals ARE the two PAPRs, in dB, over the whole symbol — the
  // gap between them is what the critical rate fails to see.
  const paprFine = paprAt(fine.re, fine.im, 1, pm0);
  const paprCrit0 = paprAt(fine.re, fine.im, L_FINE, pm0);

  return {
    observables: {
      /* --- one symbol, around its peak --- */
      envelope: { x: Float64Array.from(envT), y: Float64Array.from(envY) },
      critSamples: { x: Float64Array.from(critT), y: Float64Array.from(critY) },
      overSamples: { x: Float64Array.from(sampT), y: Float64Array.from(sampY) },
      truePeak: paprFine,
      critPeak: paprCrit0,

      /* --- the distribution --- */
      ccdf: { x: gAx, y: ccdfEmp },
      ccdfModelN: { x: gAx, y: ccdfN },
      ccdfModelAlpha: { x: gAx, y: ccdfAlpha },
      // the pill's threshold, drawn as a horizontal on the envelope and a
      // vertical on the tail — one number, two figures, the same statement
      gammaLine: gamma,

      /* --- the readings --- */
      meanPapr: { value: mean, meta: { label: 'mean PAPR', unit: '×', precision: 2 } },
      p99: { value: pct(0.99), meta: { label: 'PAPR at 99 %', unit: '×', precision: 2 } },
      overGamma: {
        value: overGamma / M,
        meta: { label: 'P(PAPR > γ)', precision: 4 },
      },
      hidden: {
        value: toDb(mean) - toDb(meanCrit),
        meta: { label: 'missed at L = 1', unit: 'dB', precision: 2 },
      },
      theoryMean: { value: harmonic(N), meta: { label: 'H_N model', unit: '×', precision: 2 } },
      worstCase: { value: N, meta: { label: 'worst case', unit: '×', precision: 0 } },
    },
  };
}
