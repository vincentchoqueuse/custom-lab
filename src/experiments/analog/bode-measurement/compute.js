// Frequency response measured AT THE OSCILLOSCOPE, the way it is done at
// the bench: inject sin(2πft), look at the steady-state output trace
//   y(t) = |H(jf)|·sin(2πft + arg H) + measurement noise,
// and extract gain and phase by least squares on a sin/cos basis (uniform
// sampling over an integer number of periods → the basis is EXACTLY
// orthogonal, so at σ = 0 the measurement equals the theory to machine
// precision — checked). A 25-point log-spaced measurement campaign is run
// the same way and scattered over the theoretical Bode curves.
// Systems: RC first order H = 1/(1 + jf/fc), and the resonant second
// order H = 1/(1 − (f/f0)² + jf/(Q·f0)).
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const FMIN = 10;
const FMAX = 10000;
const NSWEEP = 25; // measurement campaign size
const NFIT = 400; // samples per measurement
const PERIODS = 3; // scope window and fit span (integer → orthogonal basis)
const NTH = 240; // dense theory curve

/** H(jf) → {g, phi} (linear gain, phase in radians). */
function response(system, fc, f0, Q, f) {
  if (system === 'rc') {
    const x = f / fc;
    const d = 1 + x * x;
    return { g: 1 / Math.sqrt(d), phi: -Math.atan(x) };
  }
  const re = 1 - (f / f0) ** 2;
  const im = f / (Q * f0);
  const d = re * re + im * im;
  return { g: 1 / Math.sqrt(d), phi: -Math.atan2(im, re) };
}

/**
 * One bench measurement at frequency f: simulate the noisy steady-state
 * trace and least-squares fit a·sin + b·cos over PERIODS periods.
 */
function measure(system, fc, f0, Q, f, sigma, gauss, keepTrace) {
  const { g, phi } = response(system, fc, f0, Q, f);
  const T = PERIODS / f;
  const tIn = keepTrace ? new Float64Array(NFIT) : null;
  const yIn = keepTrace ? new Float64Array(NFIT) : null;
  const yOut = keepTrace ? new Float64Array(NFIT) : null;
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < NFIT; i++) {
    const t = (T * i) / NFIT;
    const w = 2 * Math.PI * f * t;
    const y = g * Math.sin(w + phi) + sigma * gauss();
    sa += y * Math.sin(w);
    sb += y * Math.cos(w);
    if (keepTrace) {
      tIn[i] = t * 1000; // ms
      yIn[i] = Math.sin(w);
      yOut[i] = y;
    }
  }
  const a = (2 * sa) / NFIT;
  const b = (2 * sb) / NFIT;
  return {
    g: Math.hypot(a, b),
    phi: Math.atan2(b, a),
    gTh: g,
    phiTh: phi,
    tIn,
    yIn,
    yOut,
  };
}

const toDb = (g) => 20 * Math.log10(Math.max(g, 1e-12));
const toDeg = (r) => (r * 180) / Math.PI;

/**
 * @param {{system: string, fc: number, f0: number, Q: number, f: number,
 *          sigma: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ system, fc, f0, Q, f, sigma, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  // the scope: current frequency, trace kept
  const m = measure(system, fc, f0, Q, f, sigma, gauss, true);

  // dense theory curves
  const tf = new Float64Array(NTH);
  const tg = new Float64Array(NTH);
  const tp = new Float64Array(NTH);
  const lr = Math.log(FMAX / FMIN);
  for (let i = 0; i < NTH; i++) {
    const fi = FMIN * Math.exp((lr * i) / (NTH - 1));
    const r = response(system, fc, f0, Q, fi);
    tf[i] = fi;
    tg[i] = toDb(r.g);
    tp[i] = toDeg(r.phi);
  }

  // the measurement campaign: NSWEEP log-spaced bench measurements
  const sf = new Float64Array(NSWEEP);
  const sg = new Float64Array(NSWEEP);
  const sp = new Float64Array(NSWEEP);
  for (let i = 0; i < NSWEEP; i++) {
    const fi = FMIN * Math.exp((lr * i) / (NSWEEP - 1));
    const mi = measure(system, fc, f0, Q, fi, sigma, gauss, false);
    sf[i] = fi;
    sg[i] = toDb(mi.g);
    sp[i] = toDeg(mi.phi);
  }

  return {
    observables: {
      scopeIn: { x: m.tIn, y: m.yIn },
      scopeOut: { x: m.tIn, y: m.yOut },
      gainTheory: { x: tf, y: tg },
      gainMeas: { x: sf, y: sg },
      phaseTheory: { x: tf, y: tp },
      phaseMeas: { x: sf, y: sp },
      gMeasDb: { value: toDb(m.g), meta: { label: 'measured gain', unit: 'dB', precision: 2 } },
      gThDb: { value: toDb(m.gTh), meta: { label: '|H| theory', unit: 'dB', precision: 2 } },
      phMeasDeg: { value: toDeg(m.phi), meta: { label: 'measured phase', unit: '°', precision: 1 } },
      phThDeg: { value: toDeg(m.phiTh), meta: { label: 'arg H theory', unit: '°', precision: 1 } },
    },
  };
}
