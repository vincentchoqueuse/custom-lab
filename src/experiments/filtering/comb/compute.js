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
import { toDb } from '../../../core/numeric.js';
import {
  BENCH,
  periodicSignal,
  steadyTime,
  steadySpectrumDb,
  responseGrid,
} from '../_lib/bench.js';

const { FS } = BENCH; // the bench discards g^(SKIP/D) ≪ 1 of transient
const DB_FLOOR = -80;

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
/** [1, 0, …, 0, v] — a bulk delay of D samples with a single tap at its end. */
function tapsAt(D, v) {
  const t = new Float64Array(D + 1);
  t[0] = 1;
  t[D] = v;
  return t;
}

export function compute({ structure, D, g, source, f0 }) {
  const x = periodicSignal(source, f0);
  const N = x.length;

  const y = new Float64Array(N);
  if (structure === 'ff') {
    for (let n = 0; n < N; n++) y[n] = x[n] + (n >= D ? g * x[n - D] : 0);
  } else {
    for (let n = 0; n < N; n++) y[n] = x[n] + (n >= D ? g * y[n - D] : 0);
  }

  const tIn = steadyTime(x, f0);
  const tOut = steadyTime(y, f0);

  const specIn = steadySpectrumDb(x, DB_FLOOR);
  const specOut = steadySpectrumDb(y, DB_FLOOR);

  // closed-form |H| overlay (dense: the teeth are sharp)
  const resp = responseGrid((f) => combGain(structure, f, D, g), DB_FLOOR, 800);

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
      tIn,
      tOut,
      specIn,
      specOut,
      resp,
      impulse: { x: hn, y: hVal },
      hImp: hVal, // raw echo train (checks: h[kD] = g^k exactly)
      // The structure tab, and this filter is where it says the most: a comb
      // needs ONE multiplication and D memories, which is the opposite trade
      // from every other filter in the module. The chain is drawn tapped at
      // its far end only — the schematic elides the middle, so the room reads
      // "a long delay line, one tap" rather than counting forty blocks.
      structB: structure === 'ff' ? tapsAt(D, g) : Float64Array.of(1),
      structA: structure === 'ff' ? Float64Array.of(1) : tapsAt(D, -g),
      maxPole: structure === 'ff' ? 0 : Math.abs(g) ** (1 / D), // checks
      toothHz: {
        value: FS / D,
        meta: { label: 'tooth spacing Fs/D', unit: 'Hz', precision: 1 },
      },
      peakDb: { value: toDb(peak), meta: { label: 'teeth', unit: 'dB', precision: 1 } },
      dipDb: { value: toDb(dip), meta: { label: 'notches', unit: 'dB', precision: 1 } },
    },
  };
}
