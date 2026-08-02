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
import { fft, toDb, windowValue } from '../../../core/numeric.js';

const FS = 8000;
const NFFT = 4096; // analysis window (bins of 1.953 Hz)
const SKIP = 4096; // discarded transient (≫ 2Q/ωc at every setting)
const DB_FLOOR = -80;
const F_SHOW = 3000; // spectrum display span (Hz)

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

  const N = SKIP + NFFT;
  const x = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const ph = (f0 * n) / FS - Math.floor((f0 * n) / FS);
    x[n] = source === 'saw' ? 2 * ph - 1 : ph < 0.5 ? 1 : -1;
  }

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

  // spectra of the steady state (Hann), input and output on one reference
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

  // |H| curves: the selected output (spectrum overlay) and all four
  const NRESP = 400;
  const hf = new Float64Array(NRESP);
  const mkResp = (o) => {
    const v = new Float64Array(NRESP);
    for (let i = 0; i < NRESP; i++) {
      hf[i] = (F_SHOW * (i + 1)) / NRESP;
      v[i] = toDb(svfGain(o, hf[i], f1, q1), DB_FLOOR);
    }
    return v;
  };
  const respSel = mkResp(output);
  const respLp = mkResp('lp');
  const respBp = mkResp('bp');
  const respHp = mkResp('hp');
  const respNotch = mkResp('notch');

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
      tIn: { x: ts, y: tIn },
      tOut: { x: ts, y: tOut },
      specIn: { x: fAxis, y: inDb },
      specOut: { x: fAxis, y: outDb },
      respSel: { x: hf, y: respSel },
      respLp: { x: hf, y: respLp },
      respBp: { x: hf, y: respBp },
      respHp: { x: hf, y: respHp },
      respNotch: { x: hf, y: respNotch },
      maxPole, // checks: stability
      f1, // checks
      gainFc: {
        value: toDb(svfGain(output, fc, f1, q1)),
        meta: { label: 'gain à f_c', unit: 'dB', precision: 1 },
      },
      resGain: {
        value: toDb(svfGain('bp', fc, f1, q1)) ,
        meta: { label: 'résonance BP à f_c', unit: 'dB', precision: 1 },
      },
    },
  };
}
