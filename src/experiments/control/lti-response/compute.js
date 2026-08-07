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
import { bodeSweep, bodeObservables, naturalPulsation, polyTransfer } from '../_lib/bode.js';
import { polyRoots } from '../_lib/lti.js';
import { realize } from '../_lib/sim.js';

const T_END = 20;
const H = 0.005;
const KEEP = 5; // display decimation (800 points)

function inputOf(kind, f) {
  if (kind === 'step') return (t) => 1;
  if (kind === 'ramp') return (t) => t;
  return (t) => Math.sin(2 * Math.PI * f * t);
}

/**
 * @param {{num: number[], den: number[], input: string, f: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ num, den, input, f }) {
  const u = inputOf(input, f);
  const { n, a, C, D } = realize(num, den);

  // x' = A x + B u in controllable canonical form (companion A, B = e_1).
  // Parameterised by the input source, because the impulse response below is
  // this same field driven by nothing at all.
  const derivWith = (src) => (x, t) => {
    let acc = -a[1] * x[0];
    for (let i = 1; i < n; i++) acc -= a[i + 1] * x[i];
    // x1' = −a1 x1 − … − an xn + u ; xi' = x_{i−1}
    const out = new Array(n);
    out[0] = acc + src(t);
    for (let i = 1; i < n; i++) out[i] = x[i - 1];
    return out;
  };
  const deriv = derivWith(u);

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

  /* ---------- impulse response: the same system, released from x(0) = B --- */
  // A Dirac at t = 0 pushes B into the state and then leaves the system
  // alone, so for t > 0 the impulse response IS the free response from
  // x(0) = B = e₁. Nothing has to be approximated by a tall thin pulse: the
  // result is as exact as the integrator, on the same grid as everything
  // else. What a plot cannot honestly draw — the D·δ(t) a bi-proper system
  // carries at the origin — is reported as a number instead.
  const hs = new Float64Array(nk);
  if (n > 0) {
    const derivFree = derivWith(() => 0);
    let xh = new Array(n).fill(0);
    xh[0] = 1;
    let wh = 0;
    for (let i = 0; i <= steps; i++) {
      const t = i * H;
      if (i % KEEP === 0) {
        let y = 0;
        for (let j = 0; j < n; j++) y += C[j] * xh[j];
        hs[wh++] = y;
      }
      if (i === steps) break;
      xh = rk4Step(derivFree, xh, t, H);
      for (let j = 0; j < n; j++) {
        if (!Number.isFinite(xh[j]) || Math.abs(xh[j]) > CLAMP) xh[j] = Math.sign(xh[j] || 1) * CLAMP;
      }
    }
  }

  /* ---------- poles and zeros of the typed-in transfer function ---------- */
  // The roots ARE the system: where they sit decides the shape of the two
  // time responses above and the two Bode curves below. Right half-plane =
  // divergence, and the plot says so before the simulation has to.
  const poles = polyRoots(den);
  const zeros = polyRoots(num);
  const plane = (roots) => ({
    x: Float64Array.from(roots, (r) => r[0]),
    y: Float64Array.from(roots, (r) => r[1]),
  });
  const maxRe = poles.length ? Math.max(...poles.map((r) => r[0])) : -Infinity;
  const verdict = maxRe > 1e-9 ? 'instable' : maxRe < -1e-9 ? 'stable' : 'marginalement stable';

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
  // denominator coefficients (_lib/bode.js), so a system typed in with any
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
      impulseResponse: { x: ts, y: hs },
      poles: plane(poles),
      zeros: plane(zeros),
      // the ramp lag still has its number, read off the last sample; the view
      // it used to have its own tab for is now the gap between u(t) and y(t)
      // on the response plot, which is where it was always visible anyway
      trackError: { x: ts, y: es },
      finalValue: { value: ys[nk - 1], meta: { label: 'y(20 s)', precision: 3 } },
      dcGain: { value: dc, meta: { label: 'DC gain', precision: 3 } },
      stability: { value: verdict, meta: { label: 'poles' } },
      // Only a bi-proper system (deg num = deg den) carries a Dirac at the
      // origin. Reporting "Dirac weight = 0.000" on every strictly proper
      // system would be a reading that means nothing, on every view: the
      // observable simply does not exist unless there is a Dirac.
      ...(D !== 0
        ? { diracWeight: { value: D, meta: { label: 'Dirac weight at t = 0', precision: 3 } } }
        : {}),
      gainMeas: { value: gainMeas, meta: { label: 'measured gain', precision: 3 } },
      gainTh: { value: gainTh, meta: { label: '|H(jω)|', precision: 3 } },
      phaseMeas: { value: phaseMeas, meta: { label: 'measured phase', unit: '°', precision: 1 } },
      phaseTh: { value: phaseTh, meta: { label: 'arg H(jω)', unit: '°', precision: 1 } },
    },
  };
}
