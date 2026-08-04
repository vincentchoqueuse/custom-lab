// Demodulating: recovering A(t) and f(t) from x(t) = A(t)·cos(φ(t)).
//
// The signal is modulated IN AMPLITUDE AND IN FREQUENCY at the same time, which
// is the interesting case: each method must separate two pieces of information
// mixed into one curve. Two methods, about as different as they come:
//
//   HILBERT is GLOBAL. One builds the analytic signal z = x + j·H{x} by
//   cancelling the negative frequencies of the spectrum, then A = |z| and
//   f = (1/2π)·dφ/dt. It therefore needs an FFT over the whole record: the
//   result at instant t depends on ALL the samples, including those that come
//   after. No real-time demodulation in that.
//
//   TEAGER–KAISER is LOCAL. The operator Ψ(x)[n] = x[n]² − x[n+1]·x[n−1] is
//   A²sin²Ω on a sinusoid: three samples, two multiplications, and it already
//   carries the product amplitude × frequency. The pair (A, Ω) is extracted from
//   it by DESA-2, three more samples. No transform, no delay, a per-point cost
//   that does not depend on the length of the signal.
//
// The DESA-2 algorithm, with y[n] = x[n+1] − x[n−1]:
//
//   Ω[n] = ½·arccos( 1 − Ψ(y)[n] / (2·Ψ(x)[n]) )
//   A[n] = 2·Ψ(x)[n] / √(Ψ(y)[n])
//
// and on a pure sinusoid these two formulas are EXACT, not approximate — that is
// the first verification of the harness.
//
// The price of locality is paid on the noise, and that is the whole subject of
// the scenes: Ψ is a product of neighbouring samples, so the noise enters it
// squared and with no averaging at all. Hilbert does an FFT, which IS an
// averaging over the whole record. The figures are in the notes, measured and not
// assumed.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { ifft, noiseSigma } from '../../../core/dsp.js';
import { fft } from '../../../core/numeric.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const FS = 8000; // Hz
const N = 1024; // samples — 128 ms, and a power of two for the FFT

const EDGE = 48; // samples ignored at both edges (see below)

/**
 * Analytic signal through the FFT: the negative frequencies are cancelled and
 * the positive ones doubled. Exact in the DFT sense, with the usual caveat — the
 * record is treated as PERIODIC, so both edges are polluted by the wrap-around
 * discontinuity. They are left out of the reading rather than windowed:
 * windowing would change the amplitude, which is precisely what is being
 * measured.
 */
export function analytic(x) {
  const n = x.length;
  const re = Float64Array.from(x);
  const im = new Float64Array(n);
  fft(re, im);
  const half = n / 2;
  for (let k = 1; k < half; k++) {
    re[k] *= 2;
    im[k] *= 2;
  }
  for (let k = half + 1; k < n; k++) {
    re[k] = 0;
    im[k] = 0;
  }
  ifft(re, im);
  return { re, im };
}

/** Ψ(x)[n] = x[n]² − x[n+1]·x[n−1] — l'opérateur d'énergie de Teager. */
export function teager(x) {
  const n = x.length;
  const p = new Float64Array(n);
  for (let i = 1; i < n - 1; i++) p[i] = x[i] * x[i] - x[i + 1] * x[i - 1];
  p[0] = p[1];
  p[n - 1] = p[n - 2];
  return p;
}

/**
 * DESA-2: instantaneous amplitude and angular frequency, from Ψ alone.
 * Exact on a pure sinusoid — verified to 1e-12 by the harness.
 *
 * The argument of the arccos is CLAMPED to [−1, 1]. That is no cosmetic
 * precaution: under noise, Ψ(y)/(2Ψ(x)) regularly leaves the interval, and that
 * is exactly how Teager breaks down. Those excursions are counted and displayed,
 * rather than made to disappear.
 */
export function desa2(x) {
  const n = x.length;
  const y = new Float64Array(n);
  for (let i = 1; i < n - 1; i++) y[i] = x[i + 1] - x[i - 1];
  const px = teager(x);
  const py = teager(y);
  const omega = new Float64Array(n);
  const amp = new Float64Array(n);
  let clipped = 0;
  for (let i = 0; i < n; i++) {
    const denom = 2 * px[i];
    let c = Math.abs(denom) > 1e-300 ? 1 - py[i] / denom : 1;
    if (c > 1 || c < -1) {
      clipped++;
      c = Math.max(-1, Math.min(1, c));
    }
    omega[i] = 0.5 * Math.acos(c);
    const s = Math.sqrt(Math.max(py[i], 0));
    amp[i] = s > 1e-300 ? (2 * Math.max(px[i], 0)) / s : 0;
  }
  return { omega, amp, clipped };
}

/** Phase unwrapping: jumps larger than π are turns, not jumps. */
export function unwrap(p) {
  const out = Float64Array.from(p);
  let off = 0;
  for (let i = 1; i < out.length; i++) {
    let d = p[i] - p[i - 1];
    while (d > Math.PI) {
      off -= 2 * Math.PI;
      d -= 2 * Math.PI;
    }
    while (d < -Math.PI) {
      off += 2 * Math.PI;
      d += 2 * Math.PI;
    }
    out[i] = p[i] + off;
  }
  return out;
}

/**
 * @param {{fc: number, ka: number, fam: number, fdev: number, ffm: number,
 *          snr: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ fc, ka, fam, fdev, ffm, snr, seed }) {
  const FC = fc;
  const gauss = gaussFrom(mulberry32(seed));

  /* ---------- the deterministic signal, then the noise -------------------- */
  const t = new Float64Array(N);
  const clean = new Float64Array(N);
  const x = new Float64Array(N);
  const aTrue = new Float64Array(N);
  const fTrue = new Float64Array(N);
  // signal power: ⟨A²⟩/2 = (1 + ka²/2)/2
  const sigPow = (1 + (ka * ka) / 2) / 2;
  const sigma = noiseSigma(sigPow, snr);
  for (let i = 0; i < N; i++) {
    const ti = i / FS;
    t[i] = ti * 1000; // ms
    const A = 1 + ka * Math.cos(2 * Math.PI * fam * ti);
    // φ(t) = 2π f_c t + (Δf/f_fm)·sin(2π f_fm t) ⇒ f_i = f_c + Δf·cos(2π f_fm t)
    const phi = 2 * Math.PI * FC * ti + (fdev / ffm) * Math.sin(2 * Math.PI * ffm * ti);
    aTrue[i] = A;
    fTrue[i] = FC + fdev * Math.cos(2 * Math.PI * ffm * ti);
    clean[i] = A * Math.cos(phi);
    x[i] = clean[i] + sigma * gauss();
  }

  /* ---------- Hilbert : global ------------------------------------------- */
  const z = analytic(x);
  const aHil = new Float64Array(N);
  const ph = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    aHil[i] = Math.hypot(z.re[i], z.im[i]);
    ph[i] = Math.atan2(z.im[i], z.re[i]);
  }
  const up = unwrap(ph);
  const fHil = new Float64Array(N);
  for (let i = 1; i < N - 1; i++) fHil[i] = ((up[i + 1] - up[i - 1]) / 2) * (FS / (2 * Math.PI));
  fHil[0] = fHil[1];
  fHil[N - 1] = fHil[N - 2];

  /* ---------- Teager–Kaiser : local -------------------------------------- */
  const d2 = desa2(x);
  const fTea = new Float64Array(N);
  for (let i = 0; i < N; i++) fTea[i] = (d2.omega[i] * FS) / (2 * Math.PI);

  /* ---------- ce que ça donne, en chiffres ------------------------------- */
  // The first and last EDGE samples are left out: Hilbert suffers there from the
  // periodic wrap-around and Teager lacks neighbours. Comparing them over the
  // same range is the only honest way to compare them.
  const rms = (a, b) => {
    let s = 0;
    let n = 0;
    for (let i = EDGE; i < N - EDGE; i++) {
      const e = a[i] - b[i];
      s += e * e;
      n++;
    }
    return Math.sqrt(s / n);
  };
  const errAH = rms(aHil, aTrue);
  const errAT = rms(d2.amp, aTrue);
  const errFH = rms(fHil, fTrue);
  const errFT = rms(fTea, fTrue);

  const cut = (a) => a.subarray(EDGE, N - EDGE);
  const tc = cut(t);

  /* ---------- the spectrum, to place the signal --------------------------- */
  const sre = Float64Array.from(x);
  const sim = new Float64Array(N);
  fft(sre, sim);
  const nf = N / 2 + 1;
  const sf = new Float64Array(nf);
  const sy = new Float64Array(nf);
  let smax = 1e-300;
  for (let k = 0; k < nf; k++) {
    const m = Math.hypot(sre[k], sim[k]);
    if (m > smax) smax = m;
  }
  for (let k = 0; k < nf; k++) {
    sf[k] = (k * FS) / N;
    sy[k] = 20 * Math.log10(Math.max(Math.hypot(sre[k], sim[k]) / smax, 1e-6));
  }

  return {
    observables: {
      signal: { x: tc, y: cut(x) },
      envTrue: { x: tc, y: cut(aTrue) },
      envHilbert: { x: tc, y: cut(aHil) },
      envTeager: { x: tc, y: cut(d2.amp) },
      freqTrue: { x: tc, y: cut(fTrue) },
      freqHilbert: { x: tc, y: cut(fHil) },
      freqTeager: { x: tc, y: cut(fTea) },
      spectrum: { x: sf, y: sy },
      fCarrier: FC, // vline: the carrier
      errAmpHilbert: {
        value: errAH,
        meta: { label: 'A error — Hilbert', precision: 4 },
      },
      errAmpTeager: {
        value: errAT,
        meta: { label: 'A error — Teager', precision: 4 },
      },
      errFreqHilbert: {
        value: errFH,
        meta: { label: 'f error — Hilbert', unit: 'Hz', precision: 2 },
      },
      errFreqTeager: {
        value: errFT,
        meta: { label: 'f error — Teager', unit: 'Hz', precision: 2 },
      },
      clipped: {
        value: d2.clipped,
        meta: { label: 'arccos hors domaine (Teager)' },
      },
      verdict: {
        value:
          errFT < errFH
            ? 'Teager tracks the frequency better'
            : errFT < 4 * errFH
              ? 'both hold'
              : 'Teager has broken down, Hilbert holds',
        meta: { label: 'comparaison' },
      },
    },
  };
}
