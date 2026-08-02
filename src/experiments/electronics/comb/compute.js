// The digital COMB filter — an echo in time IS a comb in frequency:
//   feedforward (FIR): y[n] = x[n] + g·x[n−D]   H = 1 + g·z⁻ᴰ
//   feedback   (IIR): y[n] = x[n] + g·y[n−D]   H = 1/(1 − g·z⁻ᴰ)
// Closed forms used everywhere (overlay AND checks):
//   |H_ff|² = 1 + g² + 2g·cos(2πfD/Fs)   teeth 1+g, dips 1−g
//   |H_fb|² = 1/(1 + g² − 2g·cos(2πfD/Fs)) teeth 1/(1−g), dips 1/(1+g)
// Teeth sit at k·Fs/D (g > 0); a negative g swaps teeth and dips. The
// feedback impulse response is the geometric echo train h[kD] = gᵏ
// (exactly — checked), its poles sit on |z| = |g|^(1/D) < 1. When Fs/D
// aligns with the signal's harmonics every one of them rides a tooth
// (the Karplus-Strong resonance); detune D and they fall into the dips
// (the flanger hollow). Same bench as the SVF experiment: a square or
// sawtooth at f0, steady-state spectra, harmonics tied to |H| by check.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { fft, toDb, windowValue } from '../../../core/numeric.js';

const FS = 8000;
const NFFT = 4096;
const SKIP = 4096; // transient discard (g^(SKIP/D) ≪ 1 over the whole box)
const DB_FLOOR = -80;
const F_SHOW = 3000;

/** Closed-form |H(f)| of the comb. */
export function combGain(structure, f, D, g) {
  const c = Math.cos((2 * Math.PI * f * D) / FS);
  const m2 = 1 + g * g + 2 * g * c;
  return structure === 'ff' ? Math.sqrt(m2) : 1 / Math.sqrt(1 + g * g - 2 * g * c);
}

/**
 * @param {{structure: string, D: number, g: number, source: string,
 *          f0: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ structure, D, g, source, f0 }) {
  const N = SKIP + NFFT;
  const x = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const ph = (f0 * n) / FS - Math.floor((f0 * n) / FS);
    x[n] = source === 'saw' ? 2 * ph - 1 : ph < 0.5 ? 1 : -1;
  }

  const y = new Float64Array(N);
  if (structure === 'ff') {
    for (let n = 0; n < N; n++) y[n] = x[n] + (n >= D ? g * x[n - D] : 0);
  } else {
    for (let n = 0; n < N; n++) y[n] = x[n] + (n >= D ? g * y[n - D] : 0);
  }

  // time view: three periods, steady state
  const nShow = Math.min(NFFT, Math.round((3 / f0) * FS));
  const ts = new Float64Array(nShow);
  const tIn = new Float64Array(nShow);
  const tOut = new Float64Array(nShow);
  for (let i = 0; i < nShow; i++) {
    ts[i] = (i / FS) * 1000;
    tIn[i] = x[SKIP + i];
    tOut[i] = y[SKIP + i];
  }

  // steady-state spectra (Hann), shared reference
  const spec = (sig) => {
    const re = new Float64Array(NFFT);
    const im = new Float64Array(NFFT);
    let sw = 0;
    for (let i = 0; i < NFFT; i++) {
      const w = windowValue('hann', i, NFFT);
      re[i] = sig[SKIP + i] * w;
      sw += w;
    }
    fft(re, im);
    const ref = sw / 2;
    const kMax = Math.floor(F_SHOW / (FS / NFFT));
    const out = new Float64Array(kMax + 1);
    for (let k = 0; k <= kMax; k++) out[k] = toDb(Math.hypot(re[k], im[k]) / ref, DB_FLOOR);
    return out;
  };
  const binHz = FS / NFFT;
  const inDb = spec(x);
  const outDb = spec(y);
  const fAxis = Float64Array.from(inDb, (_, k) => k * binHz);

  // closed-form |H| overlay
  const NRESP = 800; // dense: the teeth are sharp
  const hf = new Float64Array(NRESP);
  const hv = new Float64Array(NRESP);
  for (let i = 0; i < NRESP; i++) {
    hf[i] = (F_SHOW * (i + 1)) / NRESP;
    hv[i] = toDb(combGain(structure, hf[i], D, g), DB_FLOOR);
  }

  // impulse response: the echo train (first 5 echoes + margin)
  const nImp = Math.min(5 * D + 2, 900);
  const hn = new Float64Array(nImp);
  const hVal = new Float64Array(nImp);
  {
    const buf = new Float64Array(nImp);
    for (let n = 0; n < nImp; n++) {
      const xin = n === 0 ? 1 : 0;
      buf[n] =
        structure === 'ff'
          ? xin + (n === D ? g : 0)
          : xin + (n >= D ? g * buf[n - D] : 0);
      hn[n] = n;
      hVal[n] = buf[n];
    }
  }

  const peak = structure === 'ff' ? 1 + Math.abs(g) : 1 / (1 - Math.abs(g));
  const dip = structure === 'ff' ? 1 - Math.abs(g) : 1 / (1 + Math.abs(g));

  return {
    observables: {
      tIn: { x: ts, y: tIn },
      tOut: { x: ts, y: tOut },
      specIn: { x: fAxis, y: inDb },
      specOut: { x: fAxis, y: outDb },
      resp: { x: hf, y: hv },
      impulse: { x: hn, y: hVal },
      hImp: hVal, // raw echo train (checks: h[kD] = g^k exactly)
      maxPole: structure === 'ff' ? 0 : Math.abs(g) ** (1 / D), // checks
      toothHz: {
        value: FS / D,
        meta: { label: 'espacement des dents Fs/D', unit: 'Hz', precision: 1 },
      },
      peakDb: { value: toDb(peak), meta: { label: 'dents', unit: 'dB', precision: 1 } },
      dipDb: { value: toDb(dip), meta: { label: 'creux', unit: 'dB', precision: 1 } },
    },
  };
}
