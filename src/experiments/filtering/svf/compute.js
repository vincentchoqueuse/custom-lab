// A periodic digital signal (square / sawtooth) through the classic
// Chamberlin STATE VARIABLE FILTER — two multiplies, two adds per sample,
// and FOUR simultaneous outputs:
//   lp[n] = lp[n−1] + f1·bp[n−1]
//   hp[n] = x[n] − lp[n] − q1·bp[n−1]
//   bp[n] = bp[n−1] + f1·hp[n]        (notch = hp + lp)
// with f1 = 2·sin(π·fc/Fs) and q1 = 1/Q. Solving the loop in z gives
//   D(z)  = 1 + (f1² + f1·q1 − 2)·z⁻¹ + (1 − f1·q1)·z⁻²
//   H_lp  = f1²·z⁻¹/D      H_bp = f1·(1−z⁻¹)/D
//   H_hp  = (1−z⁻¹)²/D     H_notch = ((1−z⁻¹)² + f1²·z⁻¹)/D
// Two exact identities fall out (both checked): H_lp(z=1) = 1 whatever
// (f1, q1), and the notch zero sits at ω = 2π·fc/Fs EXACTLY — the reason
// f1 uses sin() and not the small-angle approximation. The steady-state
// harmonics of the simulated output must equal the input harmonics times
// |H| — the check that ties the simulation to the algebra.
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
const DB_FLOOR = -80;

/** |H(e^{j2πf/Fs})| of one SVF output. */
export function svfGain(output, f, f1, q1) {
  const w = (2 * Math.PI * f) / FS;
  const ur = Math.cos(w);
  const ui = -Math.sin(w); // z⁻¹
  // D = 1 + a1·u + a2·u²
  const a1 = f1 * f1 + f1 * q1 - 2;
  const a2 = 1 - f1 * q1;
  const u2r = ur * ur - ui * ui;
  const u2i = 2 * ur * ui;
  const dr = 1 + a1 * ur + a2 * u2r;
  const di = a1 * ui + a2 * u2i;
  // numerators: (1−u) and its square, f1²·u
  const omr = 1 - ur;
  const omi = -ui;
  let nr;
  let ni;
  if (output === 'lp') {
    nr = f1 * f1 * ur;
    ni = f1 * f1 * ui;
  } else if (output === 'bp') {
    nr = f1 * omr;
    ni = f1 * omi;
  } else if (output === 'hp') {
    nr = omr * omr - omi * omi;
    ni = 2 * omr * omi;
  } else {
    nr = omr * omr - omi * omi + f1 * f1 * ur;
    ni = 2 * omr * omi + f1 * f1 * ui;
  }
  return Math.hypot(nr, ni) / Math.hypot(dr, di);
}

/**
 * @param {{source: string, f0: number, fc: number, Q: number,
 *          output: string, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ source, f0, fc, Q, output }) {
  const f1 = 2 * Math.sin((Math.PI * fc) / FS);
  const q1 = 1 / Q;

  const x = periodicSignal(source, f0);
  const N = x.length;

  // the Chamberlin loop, all four outputs recorded
  const outs = { lp: new Float64Array(N), bp: new Float64Array(N), hp: new Float64Array(N), notch: new Float64Array(N) };
  let lp = 0;
  let bp = 0;
  for (let n = 0; n < N; n++) {
    lp += f1 * bp;
    const hp = x[n] - lp - q1 * bp;
    bp += f1 * hp;
    outs.lp[n] = lp;
    outs.hp[n] = hp;
    outs.bp[n] = bp;
    outs.notch[n] = hp + lp;
  }
  const y = outs[output];

  // Impulse response of the SELECTED output, through the very same loop —
  // a unit impulse instead of the periodic signal, from a rested state.
  const NIMP = 128;
  const hn = new Float64Array(NIMP);
  const hv = new Float64Array(NIMP);
  {
    let l = 0;
    let b2 = 0;
    for (let n = 0; n < NIMP; n++) {
      const xn = n === 0 ? 1 : 0;
      l += f1 * b2;
      const h = xn - l - q1 * b2;
      b2 += f1 * h;
      hn[n] = n;
      hv[n] = output === 'lp' ? l : output === 'hp' ? h : output === 'bp' ? b2 : h + l;
    }
  }

  const tIn = steadyTime(x, f0);
  const tOut = steadyTime(y, f0);

  const specIn = steadySpectrumDb(x, DB_FLOOR);
  const specOut = steadySpectrumDb(y, DB_FLOOR);

  // |H| curves: the selected output (spectrum overlay) and all four
  const resp = (o) => responseGrid((f) => svfGain(o, f, f1, q1), DB_FLOOR, 400);

  // stability: poles of z² + a1·z + a2
  const a1 = f1 * f1 + f1 * q1 - 2;
  const a2 = 1 - f1 * q1;
  const disc = a1 * a1 - 4 * a2;
  let maxPole;
  if (disc >= 0) {
    const s = Math.sqrt(disc);
    maxPole = Math.max(Math.abs((-a1 + s) / 2), Math.abs((-a1 - s) / 2));
  } else {
    maxPole = Math.sqrt(a2); // complex pair: |z|² = a2
  }

  return {
    observables: {
      tIn,
      impulse: { x: hn, y: hv },
      tOut,
      specIn,
      specOut,
      respSel: resp(output),
      respLp: resp('lp'),
      respBp: resp('bp'),
      respHp: resp('hp'),
      respNotch: resp('notch'),
      maxPole, // checks: stability
      f1, // checks
      gainFc: {
        value: toDb(svfGain(output, fc, f1, q1)),
        meta: { label: 'gain at f_c', unit: 'dB', precision: 1 },
      },
      resGain: {
        value: toDb(svfGain('bp', fc, f1, q1)) ,
        meta: { label: 'BP resonance at f_c', unit: 'dB', precision: 1 },
      },
    },
  };
}
