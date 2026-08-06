// One bit, and sixteen bits of quality — where the noise went.
//
// A converter has two ways to be accurate. The obvious one is to add
// comparators: every bit is 6 dB, and every bit is silicon, matching and money.
// The other one is to sample far faster than the signal needs and to arrange
// for the quantization noise to be somewhere the signal is not. That is
// noise shaping, and with ONE comparator it beats a sixteen-bit ladder.
//
// The linear model of a ΣΔ modulator is two transfer functions:
//
//     Y(z) = STF(z)·X(z) + NTF(z)·E(z)
//
// with E the quantization error. The whole art is in the NTF: take it to be
// (1 − z⁻¹)^L and the noise is multiplied by |2 sin(πf/Fs)|^L, which is ZERO at
// DC and rises towards Fs/2. The signal passes untouched, the noise is swept
// out of the band, and a filter downstream throws away the part of the spectrum
// where it went.
//
// TWO NUMBERS say everything, and the experiment measures both rather than
// asserting them:
//
//   · the in-band SQNR gains (20L + 10)·log10(OSR) — 9 dB per octave of
//     oversampling at first order, 15 dB at second. Against 6 dB per BIT for a
//     plain converter, an octave of speed is worth a bit and a half, or two and
//     a half.
//   · the TOTAL noise gets WORSE, and by an exact amount. Shaping moves noise,
//     it does not remove it: the output noise power is σ_e²·Σ|h_NTF[n]|², and
//     for (1 − z⁻¹)^L that sum is the central binomial coefficient C(2L, L) —
//     2 at first order, 6 at second. Three decibels and seven point eight,
//     paid out of band, for everything gained in it.
//
// The modulator is written in its ERROR-FEEDBACK form, which realises
// NTF = (1 − z⁻¹)^L exactly and shows it in one line: the past errors are fed
// forward with the binomial coefficients of that polynomial. A silicon
// modulator is built from integrators in a loop instead, for reasons that are
// about op-amps rather than about signal processing, and has the same NTF.
// NOT random: a ΣΔ modulator draws nothing. Its "noise" is the quantizer's own
// error, produced by the signal and entirely determined by it — which is why
// the experiment has no seed, no dice and no R, and why the linear model that
// calls that error white is a MODEL and not a description. At one bit it is
// visibly false, and the experiment measures where.
// PURE and stateless — runs in a worker.
import { fft, toDb, windowValue } from '../../../core/numeric.js';

const NFFT = 8192; // analysis window
const SKIP = 512; // discarded start-up of the loop
const NSHOW = 400; // samples on the time view
const DB_FLOOR = -160;

/** The binomial coefficients of (1 − z⁻¹)^L, which ARE the error feedback. */
export function ntfTaps(L) {
  const t = new Float64Array(L + 1);
  let c = 1;
  for (let k = 0; k <= L; k++) {
    t[k] = (k % 2 === 0 ? 1 : -1) * c;
    c = (c * (L - k)) / (k + 1);
  }
  return t; // t[0] = 1, then −L, +C(L,2), …
}

/** |NTF(f)| = |2 sin(πf/Fs)|^L, the closed form the shaping is designed to. */
export const ntfMag = (f, L) => Math.abs(2 * Math.sin(Math.PI * f)) ** L;

/** A mid-tread quantizer of b bits over [−1, 1]; b = 1 is the comparator. */
export function quantize(v, b) {
  if (b === 1) return v >= 0 ? 1 : -1;
  const levels = 2 ** b - 1;
  const step = 2 / levels;
  const q = Math.round(v / step) * step;
  return Math.max(-1, Math.min(1, q));
}

/**
 * The modulator, in error-feedback form:
 *    u[n] = x[n] + Σ_{k≥1} t[k]·e[n−k]      (t = the NTF's taps)
 *     y[n] = Q(u[n]),   e[n] = y[n] − u[n]
 * so that Y = X + NTF·E exactly, which is what makes the theory below a
 * prediction rather than a description.
 */
export function modulate(x, b, L) {
  const t = ntfTaps(L);
  const n = x.length;
  const y = new Float64Array(n);
  const e = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // PLUS, and the sign is the whole thing: NTF(z) = Σ t[k] z^{−k} with
    // t[0] = 1, so the past errors are fed forward with THEIR OWN
    // coefficients. Subtracted instead, the first-order NTF comes out
    // 1 + z⁻¹ rather than 1 − z⁻¹ — a low-pass, which sweeps the noise INTO
    // the band and costs about 6 dB per octave in the wrong direction.
    let fb = 0;
    for (let k = 1; k <= L; k++) if (i - k >= 0) fb += t[k] * e[i - k];
    const u = x[i] + fb;
    y[i] = quantize(u, b);
    e[i] = y[i] - u;
  }
  return { y, e };
}

/** Hann spectrum in dB, coherent-gain referenced so a unit sine reads 0 dB. */
function spectrumDb(sig, off) {
  const re = new Float64Array(NFFT);
  const im = new Float64Array(NFFT);
  let sw = 0;
  for (let i = 0; i < NFFT; i++) {
    const w = windowValue('hann', i, NFFT);
    re[i] = sig[off + i] * w;
    sw += w;
  }
  fft(re, im);
  const ref = sw / 2;
  const half = NFFT / 2;
  const fx = new Float64Array(half);
  const fy = new Float64Array(half);
  for (let k = 0; k < half; k++) {
    fx[k] = k / NFFT; // normalised frequency, Fs = 1
    fy[k] = toDb(Math.hypot(re[k], im[k]) / ref, DB_FLOOR);
  }
  return { x: fx, y: fy, re, im, ref };
}

/**
 * In-band SQNR: signal power over the noise power below the band edge, both
 * read off the same spectrum, with the signal's own bins excluded.
 */
export function sqnrOf(spec, fSig, edge) {
  const half = spec.x.length;
  const bin = Math.round(fSig * NFFT);
  let sig = 0;
  let noise = 0;
  for (let k = 1; k < half; k++) {
    if (spec.x[k] > edge) break;
    const p = (spec.re[k] ** 2 + spec.im[k] ** 2) / (spec.ref * spec.ref);
    if (Math.abs(k - bin) <= 3) sig += p;
    else noise += p;
  }
  return 10 * Math.log10(sig / Math.max(noise, 1e-30));
}

/**
 * @param {{bits: number, order: number, osr: number, amp: number, fin: number,
 *          }} params
 * @returns {{observables: Object}}
 */
export function compute({ bits, order, osr, amp, fin }) {
  const L = order;
  const edge = 0.5 / osr; // the band the decimator keeps
  // an on-bin input inside the band, so the signal lands on one FFT line and
  // the noise measurement is not contaminated by its own leakage
  const kSig = Math.max(1, Math.round(fin * edge * NFFT));
  const f0 = kSig / NFFT;

  const n = SKIP + NFFT;
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = amp * Math.sin(2 * Math.PI * f0 * i);

  const { y, e } = modulate(x, bits, L);
  const spec = spectrumDb(y, SKIP);

  // the same quantizer with NO shaping, at the same rate — kept as an
  // observable because it is worth looking at once: at one bit it is a square
  // wave, and its in-band content is harmonic distortion rather than noise.
  const flat = new Float64Array(n);
  for (let i = 0; i < n; i++) flat[i] = quantize(x[i], bits);
  const specFlat = spectrumDb(flat, SKIP);

  /* ---------- the |NTF| the shaping was designed to ----------------------- */
  const nf = new Float64Array(400);
  const ny = new Float64Array(400);
  // the quantization noise floor of a b-bit quantizer, spread over Fs/2 and
  // seen through the same window: the level the shaped curve is lifted from
  const lsb = bits === 1 ? 2 : 2 / (2 ** bits - 1);
  const floorDb = 10 * Math.log10((lsb * lsb) / 12 / (NFFT / 2)) + 3;
  for (let i = 0; i < 400; i++) {
    const f = (0.5 * (i + 0.5)) / 400;
    nf[i] = f;
    ny[i] = floorDb + 20 * Math.log10(Math.max(ntfMag(f, L), 1e-12));
  }

  /* ---------- SQNR against the oversampling ratio ------------------------- */
  // measured, not plotted from the formula: each point re-runs the modulator
  const ratios = [4, 8, 16, 32, 64, 128];
  const ox = new Float64Array(ratios.length);
  const oy = new Float64Array(ratios.length);
  for (let i = 0; i < ratios.length; i++) {
    const r = ratios[i];
    const e2 = 0.5 / r;
    const k2 = Math.max(1, Math.round(fin * e2 * NFFT));
    const xr = new Float64Array(n);
    for (let j = 0; j < n; j++) xr[j] = amp * Math.sin((2 * Math.PI * k2 * j) / NFFT);
    ox[i] = Math.log2(r);
    oy[i] = sqnrOf(spectrumDb(modulate(xr, bits, L).y, SKIP), k2 / NFFT, e2);
  }
  // the two theory lines, as slopes anchored on the measurement at OSR = 16
  const anchor = 2; // index of OSR = 16
  const th = (slope) => {
    const t = new Float64Array(ratios.length);
    for (let i = 0; i < ratios.length; i++) t[i] = oy[anchor] + slope * (ox[i] - ox[anchor]);
    return { x: ox, y: t };
  };

  /* ---------- the time view ------------------------------------------------ */
  const tt = new Float64Array(NSHOW);
  const tx = new Float64Array(NSHOW);
  const ty = new Float64Array(NSHOW);
  for (let i = 0; i < NSHOW; i++) {
    tt[i] = i;
    tx[i] = x[SKIP + i];
    ty[i] = y[SKIP + i];
  }
  // what the decimator gets back: the bit stream through an ideal brick-wall
  // low-pass at the band edge, which is a filter in frequency and one line here
  const rec = new Float64Array(NSHOW);
  {
    const re = new Float64Array(NFFT);
    const im = new Float64Array(NFFT);
    for (let i = 0; i < NFFT; i++) re[i] = y[SKIP + i];
    fft(re, im);
    const kMax = Math.floor(edge * NFFT);
    for (let k = 0; k <= NFFT / 2; k++)
      if (k > kMax) {
        re[k] = 0;
        im[k] = 0;
        if (k > 0 && k < NFFT / 2) {
          re[NFFT - k] = 0;
          im[NFFT - k] = 0;
        }
      }
    // inverse transform by conjugation, since fft is the only one available
    for (let k = 0; k < NFFT; k++) im[k] = -im[k];
    fft(re, im);
    for (let i = 0; i < NSHOW; i++) rec[i] = re[i] / NFFT;
  }

  const sqnr = sqnrOf(spec, f0, edge);
  // WHAT THE SHAPING BOUGHT, against the honest baseline: the same quantizer
  // oversampled by the same ratio and NOT shaped, which already gains
  // 3 dB per octave for free by spreading its noise over a band the decimator
  // mostly throws away. 6.02b + 1.76 + 10·log10(OSR) is that baseline, and the
  // difference is the shaping alone. Comparing against the square wave a 1-bit
  // Nyquist quantizer produces would compare against harmonic distortion
  // instead, and report that shaping made things worse.
  const plain = 6.02 * bits + 1.76 + 10 * Math.log10(osr);

  // THE INVOICE, and it is an identity rather than a measurement: y = x + NTF·e
  // exactly in this form, so the output noise power is σ_e²·Σt², and Σt² for
  // (1 − z⁻¹)^L is the central binomial coefficient C(2L, L) — 2 and 6. The
  // ratio is taken in the time domain on y − x and on e themselves, so it holds
  // at ONE bit too, where the quantization error is neither white nor
  // independent of the signal and every spectral argument fails.
  let pn = 0;
  let pe = 0;
  for (let i = SKIP; i < n; i++) {
    pn += (y[i] - x[i]) ** 2;
    pe += e[i] * e[i];
  }

  return {
    observables: {
      tIn: { x: tt, y: tx },
      tOut: { x: tt, y: ty },
      tRec: { x: tt, y: rec },

      specOut: spec,
      specFlat: { x: specFlat.x, y: specFlat.y },
      ntfCurve: { x: nf, y: ny },
      bandEdge: edge,

      sqnrCurve: { x: ox, y: oy },
      slope1: th(9.03),
      slope2: th(15.05),
      osrLine: Math.log2(osr),

      sqnr: { value: sqnr, meta: { label: 'in-band SQNR', unit: 'dB', precision: 1 } },
      enob: { value: (sqnr - 1.76) / 6.02, meta: { label: 'effective bits', precision: 2 } },
      gain: {
        value: sqnr - plain,
        meta: { label: 'what the shaping bought over plain oversampling', unit: 'dB', precision: 1 },
      },
      total: {
        value: 10 * Math.log10(pn / pe),
        meta: { label: 'total noise vs the quantizer alone — the invoice', unit: 'dB', precision: 2 },
      },
      totalRatio: pn / pe, // checks: must be C(2L, L), exactly
    },
  };
}
