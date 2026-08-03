// Time response of ANY proper LTI system H(s) = num(s)/den(s) — the
// coefficients are typed in directly (descending powers of s, `coeffs`
// fields) — to a step, a unit ramp or a sine. The transfer function is
// realized in controllable canonical form and integrated by RK4 with the
// continuous input evaluated inside the stages (h = 5 ms over 20 s).
// For the sine, the steady state is fitted on the last periods (least
// squares on a sin/cos basis) and compared to H(jω): the measured gain and
// phase ARE |H| and arg H — the living definition of frequency response.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { rk4Step, polyEvalComplex } from '../../../core/numeric.js';
import { bodeSweep, bodeObservables, naturalPulsation, polyTransfer } from '../../../core/bode.js';

const T_END = 20;
const H = 0.005;
const KEEP = 5; // display decimation (800 points)

function inputOf(kind, f) {
  if (kind === 'step') return (t) => 1;
  if (kind === 'ramp') return (t) => t;
  return (t) => Math.sin(2 * Math.PI * f * t);
}

/** Controllable canonical realization of num/den (descending powers). */
function realize(num, den) {
  const a0 = den[0];
  const a = den.map((v) => v / a0); // monic denominator, length n+1
  const n = a.length - 1;
  const b = new Float64Array(n + 1); // numerator padded to length n+1
  for (let i = 0; i < num.length; i++) b[n + 1 - num.length + i] = num[i] / a0;
  const D = b[0];
  const C = new Float64Array(n);
  for (let i = 1; i <= n; i++) C[i - 1] = b[i] - b[0] * a[i];
  return { n, a, C, D };
}

/**
 * @param {{num: number[], den: number[], input: string, f: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ num, den, input, f }) {
  const u = inputOf(input, f);
  const { n, a, C, D } = realize(num, den);

  // x' = A x + B u in controllable canonical form (companion A, B = e_1)
  const deriv = (x, t) => {
    let acc = -a[1] * x[0];
    for (let i = 1; i < n; i++) acc -= a[i + 1] * x[i];
    // x1' = −a1 x1 − … − an xn + u ; xi' = x_{i−1}
    const out = new Array(n);
    out[0] = acc + u(t);
    for (let i = 1; i < n; i++) out[i] = x[i - 1];
    return out;
  };

  const yOf = (x, t) => {
    let y = D * u(t);
    // C is ordered [c1 … cn] matching the phase-variable chain
    for (let i = 0; i < n; i++) y += C[i] * x[i];
    return y;
  };

  const steps = Math.round(T_END / H);
  const nk = Math.floor(steps / KEEP) + 1;
  const ts = new Float64Array(nk);
  const us = new Float64Array(nk);
  const ys = new Float64Array(nk);
  const es = new Float64Array(nk);
  const CLAMP = 1e9;

  let x = new Array(Math.max(n, 1)).fill(0);
  // steady-state sine fit accumulators (last 2/f seconds)
  const fitT0 = input === 'sine' ? T_END - 2 / f : Infinity;
  let sSin = 0;
  let sCos = 0;
  let nFit = 0;

  let w = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i * H;
    const y = n === 0 ? D * u(t) : yOf(x, t);
    if (i % KEEP === 0) {
      ts[w] = t;
      us[w] = u(t);
      ys[w] = y;
      es[w] = u(t) - y;
      w++;
    }
    if (t >= fitT0) {
      // least squares on an orthogonal sin/cos basis (uniform sampling)
      sSin += y * Math.sin(2 * Math.PI * f * t);
      sCos += y * Math.cos(2 * Math.PI * f * t);
      nFit++;
    }
    if (i === steps || n === 0) {
      if (n === 0 && i < steps) continue;
      if (i === steps) break;
    }
    if (n > 0) {
      x = rk4Step(deriv, x, t, H);
      for (let j = 0; j < n; j++) {
        if (!Number.isFinite(x[j]) || Math.abs(x[j]) > CLAMP) x[j] = Math.sign(x[j] || 1) * CLAMP;
      }
    }
  }

  // theory H(jω) for the sine (complex polynomial evaluation)
  let gainTh = NaN;
  let phaseTh = NaN;
  let gainMeas = NaN;
  let phaseMeas = NaN;
  if (input === 'sine') {
    const wg = 2 * Math.PI * f;
    const [nr, ni] = polyEvalComplex(num, 0, wg);
    const [dr, di] = polyEvalComplex(den, 0, wg);
    const dm = dr * dr + di * di;
    const hr = (nr * dr + ni * di) / dm;
    const hi = (ni * dr - nr * di) / dm;
    gainTh = Math.hypot(hr, hi);
    phaseTh = (Math.atan2(hi, hr) * 180) / Math.PI;
    // y ≈ A sin(ωt) + B cos(ωt): A = 2⟨y·sin⟩, B = 2⟨y·cos⟩
    const A = (2 * sSin) / nFit;
    const B = (2 * sCos) / nFit;
    gainMeas = Math.hypot(A, B);
    phaseMeas = (Math.atan2(B, A) * 180) / Math.PI;
  }

  const dc = den[den.length - 1] !== 0 ? num[num.length - 1] / den[den.length - 1] : NaN;

  /* ---------- the Bode pair, for ANY typed-in transfer function ----------- */
  // The grid is centred on the characteristic pulsation read off the
  // denominator coefficients (core/bode.js), so a system typed in with any
  // coefficients still arrives framed on its own decades instead of on a
  // straight line. The phase is unwrapped: a fourth order goes past −180°,
  // and atan2's fold would be a jump the system does not have.
  const wn = naturalPulsation(den);
  const bode = bodeSweep(polyTransfer(num, den), {
    center: Number.isFinite(wn) && wn > 0 ? wn : 1,
  });
  // the sine measurement, as ONE point on those two curves: this experiment
  // claims the measured gain and phase ARE |H| and arg H, and here they are,
  // sitting on the theory
  const wMeas = input === 'sine' ? 2 * Math.PI * f : NaN;
  const pt = (v) => ({ x: Float64Array.from([wMeas]), y: Float64Array.from([v]) });

  return {
    observables: {
      ...bodeObservables(bode),
      gainPoint: pt(input === 'sine' ? 20 * Math.log10(gainMeas) : NaN),
      phasePoint: pt(phaseMeas),
      wMeas, // vline: the pulsation the sine is actually exciting
      inputSignal: { x: ts, y: us },
      output: { x: ts, y: ys },
      trackError: { x: ts, y: es },
      finalValue: { value: ys[nk - 1], meta: { label: 'y(20 s)', precision: 3 } },
      dcGain: { value: dc, meta: { label: 'gain statique', precision: 3 } },
      gainMeas: { value: gainMeas, meta: { label: 'gain mesuré', precision: 3 } },
      gainTh: { value: gainTh, meta: { label: '|H(jω)|', precision: 3 } },
      phaseMeas: { value: phaseMeas, meta: { label: 'phase mesurée', unit: '°', precision: 1 } },
      phaseTh: { value: phaseTh, meta: { label: 'arg H(jω)', unit: '°', precision: 1 } },
    },
  };
}
