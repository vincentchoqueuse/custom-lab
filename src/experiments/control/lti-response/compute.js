// Time response of ANY proper LTI system H(s) = num(s)/den(s) — the
// coefficients are typed in directly (descending powers of s, `coeffs`
// fields) — to a step, a unit ramp or a sine. The transfer function is
// realized in controllable canonical form and integrated by RK4 with the
// continuous input evaluated inside the stages (h = 5 ms over 20 s).
// For the sine, the steady state is fitted on the last periods (least
// squares on a sin/cos basis) and compared to H(jω): the measured gain and
// phase ARE |H| and arg H — the living definition of frequency response.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.

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
  const deriv = (x, t, out) => {
    let acc = -a[1] * x[0];
    for (let i = 1; i < n; i++) acc -= a[i + 1] * x[i];
    // x1' = −a1 x1 − … − an xn + u ; xi' = x_{i−1}
    out[0] = acc + u(t);
    for (let i = 1; i < n; i++) out[i] = x[i - 1];
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

  let x = new Float64Array(Math.max(n, 1));
  const k1 = new Float64Array(n || 1);
  const k2 = new Float64Array(n || 1);
  const k3 = new Float64Array(n || 1);
  const k4 = new Float64Array(n || 1);
  const tmp = new Float64Array(n || 1);
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
    deriv(x, t, k1);
    for (let j = 0; j < n; j++) tmp[j] = x[j] + (H / 2) * k1[j];
    deriv(tmp, t + H / 2, k2);
    for (let j = 0; j < n; j++) tmp[j] = x[j] + (H / 2) * k2[j];
    deriv(tmp, t + H / 2, k3);
    for (let j = 0; j < n; j++) tmp[j] = x[j] + H * k3[j];
    deriv(tmp, t + H, k4);
    for (let j = 0; j < n; j++) {
      x[j] += (H / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
      if (!Number.isFinite(x[j]) || Math.abs(x[j]) > CLAMP) x[j] = Math.sign(x[j] || 1) * CLAMP;
    }
  }

  // theory H(jω) for the sine (complex polynomial evaluation)
  const evalPoly = (c, re, im) => {
    // Horner in the complex plane, descending powers
    let ar = 0;
    let ai = 0;
    for (const v of c) {
      const nr = ar * re - ai * im + v;
      ai = ar * im + ai * re;
      ar = nr;
    }
    return [ar, ai];
  };
  let gainTh = NaN;
  let phaseTh = NaN;
  let gainMeas = NaN;
  let phaseMeas = NaN;
  if (input === 'sine') {
    const wg = 2 * Math.PI * f;
    const [nr, ni] = evalPoly(num, 0, wg);
    const [dr, di] = evalPoly(den, 0, wg);
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

  return {
    observables: {
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
