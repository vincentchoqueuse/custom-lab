// THE WAVELET TRANSFORM — where the spectral module's story ends. The
// spectrogram left the chapter on Gabor's impasse: one window for the whole
// signal, choose where to be good. The wavelet pyramid is the historical
// answer — resolution that ADAPTS to scale: fine wavelets for clicks, coarse
// ones for tones — and its coefficients are an orthonormal basis, so every
// identity here is exact (perfect reconstruction, Parseval, the error of a
// K-term compression known before reconstructing).
//
// The transform itself lives in _lib/wavelets.js (Haar and Daubechies-4,
// periodized). This file stages it: the pyramid as a stack of stem panels,
// a K-largest compression, and the sorted-decay DUEL against the Fourier
// basis of the same signal — sparsity as a property of the PAIR.
// PURE, stateless — deterministic (no draw: not random). Runs in a worker.
import { fft } from '../../../core/numeric.js';
import { dwt, idwt } from '../_lib/wavelets.js';

const N = 512;
const J = 3; // pyramid depth on display: d1, d2, d3 and a3 — the stack's four

// Donoho's blocks — the classic piecewise-constant test signal
const BLOCK_T = [0.1, 0.13, 0.15, 0.23, 0.25, 0.4, 0.44, 0.65, 0.76, 0.78, 0.81];
const BLOCK_H = [4, -5, 3, -4, 5, -4.2, 2.1, 4.3, -3.1, 2.1, -4.2];

/** The signal x(t), t ∈ [0, 1). All closed forms. */
function signalAt(kind, t) {
  if (kind === 'blocks') {
    let v = 0;
    for (let j = 0; j < BLOCK_T.length; j++) if (t >= BLOCK_T[j]) v += BLOCK_H[j];
    return 0.35 * v;
  }
  if (kind === 'burst')
    // a steady tone, and a click 12 ms wide at t = 0.62: the two kinds of
    // event one window cannot serve at once
    return (
      0.7 * Math.sin(2 * Math.PI * 12 * t) +
      1.6 * Math.exp(-(((t - 0.62) / 0.012) ** 2)) * Math.sin(2 * Math.PI * 80 * t)
    );
  if (kind === 'sine') return Math.sin(2 * Math.PI * 8 * t); // exactly on DFT bin 8
  return 2 * t - 1; // ramp — what two vanishing moments annihilate
}

/**
 * @param {{signal: string, wavelet: string, K: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ signal, wavelet, K }) {
  const t = new Float64Array(N);
  const x = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    t[n] = n / N;
    x[n] = signalAt(signal, t[n]);
  }

  /* ---------- the pyramid ------------------------------------------------- */
  const { approx, details } = dwt(x, J, wavelet);

  // each level's stems sit at the CENTER of their wavelet's support, so an
  // event reads straight down through the panels at its own instant
  const level = (d, j) => ({
    x: Float64Array.from(d, (_, k) => ((k + 0.5) * 2 ** j) / N),
    y: Float64Array.from(d),
  });
  const d1 = level(details[0], 1);
  const d2 = level(details[1], 2);
  const d3 = level(details[2], 3);
  const a3 = level(approx, 3);

  /* ---------- K-largest compression --------------------------------------- */
  // flatten, rank by magnitude, keep K, rebuild. Orthonormality makes the
  // damage a closed form: the squared error IS the discarded energy.
  const flat = [];
  approx.forEach((v, k) => flat.push({ v, band: -1, k }));
  details.forEach((d, j) => d.forEach((v, k) => flat.push({ v, band: j, k })));
  flat.sort((p, q) => Math.abs(q.v) - Math.abs(p.v) || p.band - q.band || p.k - q.k);
  const keep = Math.min(K, N);

  const ca = new Float64Array(approx.length);
  const cd = details.map((d) => new Float64Array(d.length));
  let kept = 0;
  let discarded = 0;
  flat.forEach((c, rank) => {
    if (rank < keep) {
      if (c.band < 0) ca[c.k] = c.v;
      else cd[c.band][c.k] = c.v;
      kept += c.v * c.v;
    } else discarded += c.v * c.v;
  });
  const recon = idwt(ca, cd, wavelet);

  let se = 0;
  for (let n = 0; n < N; n++) se += (recon[n] - x[n]) ** 2;
  const nnz = flat.filter((c) => Math.abs(c.v) > 1e-9).length;

  /* ---------- the duel: sorted decay, this basis against Fourier ---------- */
  // the same signal expanded in the orthonormal DFT (X/√N keeps Parseval):
  // which basis needs fewer coefficients is a fact about the PAIR, and the
  // two curves swap winners between 'blocks' and 'sine'
  const fr = Float64Array.from(x);
  const fi = new Float64Array(N);
  fft(fr, fi);
  const fmag = Float64Array.from(fr, (_, k) => Math.hypot(fr[k], fi[k]) / Math.sqrt(N));
  fmag.sort((a, b) => b - a);
  const wmag = Float64Array.from(flat, (c) => Math.abs(c.v));

  const FLOOR = 1e-16; // a log axis never eats a zero
  const rank = Float64Array.from({ length: N }, (_, i) => i + 1);
  const decayW = Float64Array.from(wmag, (v) => Math.max(v, FLOOR));
  const decayF = Float64Array.from(fmag, (v) => Math.max(v, FLOOR));

  // how many coefficients each basis needs for 95 % of the energy
  const k95 = (mags) => {
    const total = mags.reduce((s, v) => s + v * v, 0);
    let acc = 0;
    for (let i = 0; i < mags.length; i++) {
      acc += mags[i] * mags[i];
      if (acc >= 0.95 * total) return i + 1;
    }
    return mags.length;
  };

  const totalE = kept + discarded;

  return {
    observables: {
      signalXY: { x: t, y: x },
      reconXY: { x: t, y: Float64Array.from(recon) },
      d1,
      d2,
      d3,
      a3,
      decayWavelet: { x: rank, y: decayW },
      decayFourier: { x: rank, y: decayF },
      kNow: K, // vline on the decay view
      energyKept: {
        value: (100 * kept) / totalE,
        meta: { label: 'energy kept', unit: '%', precision: 2 },
      },
      rmsErr: { value: Math.sqrt(se / N), meta: { label: 'RMS error', precision: 4 } },
      nnz: { value: nnz, meta: { label: 'nonzero coefficients', precision: 0 } },
      k95w: { value: k95(wmag), meta: { label: 'K₉₅ wavelet', precision: 0 } },
      k95f: { value: k95(fmag), meta: { label: 'K₉₅ Fourier', precision: 0 } },
    },
  };
}
