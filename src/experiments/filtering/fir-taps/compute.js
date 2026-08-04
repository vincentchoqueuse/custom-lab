// A hand-tuned FIR: you type the coefficients, the three classic pictures
// answer. y[n] = Σ b[k]·x[n−k], so the taps ARE the impulse response and
//   H(f) = Σ b[k]·e^{−j2πfk/Fs}
// Three exact identities the checks lean on:
//   · H(0) = Σb — the DC gain is the sum of the taps, nothing else;
//   · a length-L moving average nulls exactly at k·Fs/L (Dirichlet zeros);
//   · b = [0…0,1] is an all-pass pure delay: |H| = 1 everywhere and the
//     output is the input shifted by D samples, bit for bit.
// Same bench as the SVF and comb experiments (_lib/bench.js): a periodic
// signal, steady-state time and spectra, the |H| overlay — so the three
// filtering experiments read identically and this file stays short.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { toDb } from '../../../core/numeric.js';
import {
  BENCH,
  periodicSignal,
  steadyTime,
  steadySpectrumDb,
  responseGrid,
} from '../_lib/bench.js';

const { FS } = BENCH;
const DB_FLOOR = -60;

/** |H(f)| = |Σ b[k]·e^{−j2πfk/Fs}| (direct sum: b is short by design). */
export function firGain(b, f) {
  const w = (2 * Math.PI * f) / FS;
  let re = 0;
  let im = 0;
  for (let k = 0; k < b.length; k++) {
    re += b[k] * Math.cos(w * k);
    im -= b[k] * Math.sin(w * k);
  }
  return Math.hypot(re, im);
}

/**
 * @param {{b: number[], source: string, f0: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ b, source, f0 }) {
  const x = periodicSignal(source, f0);
  const N = x.length;

  const y = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    let acc = 0;
    for (let k = 0; k < b.length && k <= n; k++) acc += b[k] * x[n - k];
    y[n] = acc;
  }

  // the taps ARE the impulse response
  const idx = Float64Array.from(b, (_, k) => k);
  const taps = Float64Array.from(b);

  let dc = 0;
  for (const c of b) dc += c;
  let nyq = 0;
  for (let k = 0; k < b.length; k++) nyq += b[k] * (k % 2 === 0 ? 1 : -1);

  // linear phase ⇔ symmetric or antisymmetric taps (delay (L−1)/2)
  let sym = true;
  let anti = true;
  for (let k = 0; k < b.length; k++) {
    if (Math.abs(b[k] - b[b.length - 1 - k]) > 1e-12) sym = false;
    if (Math.abs(b[k] + b[b.length - 1 - k]) > 1e-12) anti = false;
  }
  const linPhase = sym || anti;

  return {
    observables: {
      taps: { x: idx, y: taps },
      tIn: steadyTime(x, f0),
      tOut: steadyTime(y, f0),
      specIn: steadySpectrumDb(x, DB_FLOOR),
      specOut: steadySpectrumDb(y, DB_FLOOR),
      resp: responseGrid((f) => firGain(b, f), DB_FLOOR),
      hTaps: taps, // Inspector download + checks
      yFull: y, // checks (pure-delay identity)
      dcGain: { value: dc, meta: { label: 'H(0) = Σb', precision: 4 } },
      nyqGain: {
        value: toDb(Math.abs(nyq), DB_FLOOR), // an exact null reads as the floor
        meta: { label: 'gain at Fs/2', unit: 'dB', precision: 1 },
      },
      order: { value: b.length - 1, meta: { label: 'ordre', precision: 0 } },
      delayMs: {
        value: linPhase ? (((b.length - 1) / 2) * 1000) / FS : NaN,
        meta: { label: 'delay (linear phase)', unit: 'ms', precision: 2 },
      },
    },
  };
}
