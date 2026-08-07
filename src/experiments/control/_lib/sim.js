// The NUMERICAL-INTEGRATION half of the subject's shared code — what
// _lib/lti.js deliberately refuses to hold (its charter is closed forms).
//
// One realization, one integrator, shared: `lti-response` types in an
// arbitrary H(s) and drives it with three inputs; `root-locus` closes a loop
// and steps the result at every K. Both need the same two pieces — put a
// proper transfer function in state space, then march it — and a second copy
// of a state-space realization is exactly the kind of code that drifts.
//
// PURE: no DOM, no state. Importable from compute.js and check.js.

import { rk4Step } from '../../../core/numeric.js';

/**
 * Controllable canonical realization of H(s) = num/den (descending powers,
 * deg num ≤ deg den): x' = A x + B u with companion A and B = e₁, then
 * y = C x + D u. This is the form in which the phase variables chain
 * (xᵢ' = xᵢ₋₁) and the whole matrix lives in the last row.
 */
export function realize(num, den) {
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
 * Time response of H(s) = num/den to the input u(t), by RK4 on the
 * controllable canonical form. Returns the DECIMATED trace {t, y} — `keep`
 * sets one kept sample per so many steps. The state is clamped at ±1e9: an
 * unstable loop must draw a divergence, not throw an overflow at the worker.
 *
 * @param {number[]} num  descending powers
 * @param {number[]} den  descending powers, deg den ≥ deg num
 * @param {(t: number) => number} u
 * @param {{T?: number, h?: number, keep?: number}} opts
 * @returns {{t: Float64Array, y: Float64Array}}
 */
export function simulate(num, den, u, { T = 12, h = 0.004, keep = 6 } = {}) {
  const { n, a, C, D } = realize(num, den);
  const CLAMP = 1e9;

  const deriv = (x, t) => {
    let acc = 0;
    for (let i = 0; i < n; i++) acc -= a[i + 1] * x[i];
    const out = new Array(n);
    out[0] = acc + u(t);
    for (let i = 1; i < n; i++) out[i] = x[i - 1];
    return out;
  };

  const steps = Math.round(T / h);
  const nk = Math.floor(steps / keep) + 1;
  const ts = new Float64Array(nk);
  const ys = new Float64Array(nk);

  let x = new Array(Math.max(n, 1)).fill(0);
  let w = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i * h;
    if (i % keep === 0) {
      let y = D * u(t);
      for (let j = 0; j < n; j++) y += C[j] * x[j];
      ts[w] = t;
      ys[w] = y;
      w++;
    }
    if (i === steps) break;
    if (n === 0) continue; // a pure gain has no state to march
    x = rk4Step(deriv, x, t, h);
    for (let j = 0; j < n; j++) {
      if (!Number.isFinite(x[j]) || Math.abs(x[j]) > CLAMP) x[j] = Math.sign(x[j] || 1) * CLAMP;
    }
  }
  return { t: ts, y: ys };
}
