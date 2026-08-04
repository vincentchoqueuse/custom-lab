import { compute, closedParams, openLoop, closeIt, isoModulus } from './compute.js';
import { secondOrderStep as stepValue } from '../_lib/lti.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const BASE = { w0: 1, m: 0.5, K: 4, seed: 34 };
const obs = (p) => compute({ ...BASE, ...p }).observables;
const CASES = [
  { w0: 1, m: 0.5, K: 4 },
  { w0: 3, m: 0.2, K: 0.5 },
  { w0: 0.4, m: 1.3, K: 20 },
  { w0: 8, m: 0.05, K: 0.1 },
];

export const checks = [
  {
    name: 'the closed loop IS a second order: ω₀√(1+K), m/√(1+K), K/(1+K)',
    category: 'numeric',
    run() {
      // The identity that carries the whole experiment: the response computed by
      // closing the loop must be, point by point, that of a second order whose
      // three parameters are given in closed form.
      const gap = maxGap(CASES, ({ w0, m, K }) => {
        const o = obs({ w0, m, K });
        const bf = closedParams(K, m, w0);
        return maxGap(
          range(o.stepClosed.x.length),
          (i) => o.stepClosed.y[i],
          (i) => stepValue(bf.K, bf.m, bf.w0, o.stepClosed.x[i])
        );
      });
      return { ok: gap < 1e-13, detail: `max gap ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'proportional feedback DOES NOT MOVE the real part of the poles',
    category: 'numeric',
    run() {
      // m'ω₀' = (m/√(1+K))·(ω₀√(1+K)) = mω₀: the coefficient of s is the same on
      // both sides. The envelope therefore decays exactly as fast closed-loop as
      // open-loop — which nobody predicts.
      const gap = maxGap(CASES, ({ w0, m, K }) => {
        const bf = closedParams(K, m, w0);
        const o = obs({ w0, m, K });
        return Math.max(Math.abs(bf.m * bf.w0 - m * w0), Math.abs(o.envelope.value - m * w0));
      });
      // and the natural frequency does rise by √(1+K)
      const grows = [0.1, 1, 4, 20].every((K, i, a) => {
        const v = closedParams(K, 0.5, 1).w0;
        return Math.abs(v - Math.sqrt(1 + K)) < 1e-13 && (i === 0 || v > closedParams(a[i - 1], 0.5, 1).w0);
      });
      return { ok: gap < 1e-13 && grows, detail: `max gap ${gap.toExponential(2)}, ω₀′ = ω₀√(1+K) increasing` };
    },
  },
  {
    name: 'the steady-state error is exactly 1/(1+K)',
    category: 'numeric',
    run() {
      const gap = maxGap(CASES, ({ w0, m, K }) => {
        const o = obs({ w0, m, K });
        // the final value of the closed-loop step response, and the announced number
        const yInf = o.stepClosed.y[o.stepClosed.y.length - 1];
        return Math.max(
          Math.abs(o.staticError.value - 1 / (1 + K)),
          Math.abs(o.staticGain.value - K / (1 + K)),
          Math.abs(o.staticGain.value + o.staticError.value - 1),
          Math.abs(yInf - K / (1 + K)) // 9/(mω₀) : le régime est établi
        );
      });
      return { ok: gap < 2e-4, detail: `max gap ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'Bode: the closed-loop curve really is L/(1+L), point by point',
    category: 'numeric',
    run() {
      const gap = maxGap(CASES, ({ w0, m, K }) => {
        const o = obs({ w0, m, K });
        return maxGap(
          range(o.gain.x.length),
          (i) => 10 ** (o.gainClosed.y[i] / 20),
          (i) => Math.hypot(...closeIt(openLoop(o.gain.x[i], { K, m, w0 })))
        );
      });
      return { ok: gap < 1e-13, detail: `max gap ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'the chart measures the resonance the closed form predicts',
    category: 'numeric',
    run() {
      // The highlighted contour is M_r = K′/(2m′√(1−m′²)), computed on the
      // closed loop. Two EXACT claims rather than one approximate: the maximum
      // read off the drawn grid cannot be closer than the grid step, which would
      // teach nothing. What is exact is (a) that |T| evaluated at the
      // closed-form resonant frequency equals M exactly, and (b) that no drawn
      // point exceeds M — tangency, not secancy.
      let worst = 0;
      let below = true;
      let touches = true;
      for (const { w0, m, K } of CASES) {
        const o = obs({ w0, m, K });
        if (!Number.isFinite(o.mrDb.value)) continue;
        const M = 10 ** (o.mrDb.value / 20);
        // (a) exact : |T(jω_r)| = M_r
        const atWr = Math.hypot(...closeIt(openLoop(o.wrOut.value, { K, m, w0 })));
        worst = Math.max(worst, Math.abs(atWr - M) / M);
        // (b) no point of the closed-loop curve exceeds the contour, and the
        //     Black locus approaches one to the resolution of the grid
        let closest = Infinity;
        for (let i = 0; i < o.gain.x.length; i++) {
          if (10 ** (o.gainClosed.y[i] / 20) > M * (1 + 1e-12)) below = false;
          const rs = isoModulus(M, o.black.x[i]);
          const here = 10 ** (o.black.y[i] / 20);
          if (rs.length) closest = Math.min(closest, Math.min(...rs.map((r) => Math.abs(r - here) / M)));
        }
        if (!(closest < 5e-3)) touches = false;
      }
      return {
        ok: worst < 1e-13 && below && touches,
        detail: `|T(jω_r)| = M_r to ${worst.toExponential(2)}, nothing above, locus tangent`,
      };
    },
  },
  {
    name: 'resonance threshold: m/√(1+K) < 1/√2, and no peak above it',
    category: 'numeric',
    run() {
      // Closing the loop DE-DAMPS: a plant that does not resonate can start
      // resonating once the loop is closed.
      //   m/√(1+K) < 1/√2  ⟺  1 + K > 2m²  ⟺  K > 2m² − 1
      // The threshold is positive only for m > 1/√2, that is, precisely for the
      // plants that did not resonate on their own.
      const gap = maxGap([0.75, 0.8, 0.9, 1.2], (m) => {
        const kCrit = 2 * m * m - 1;
        const below = obs({ m, K: kCrit * 0.95 });
        const above = obs({ m, K: kCrit * 1.05 });
        const exact = Math.abs(closedParams(kCrit, m, 1).m - Math.SQRT1_2);
        const right = Number.isNaN(below.mrDb.value) && Number.isFinite(above.mrDb.value);
        return Math.max(exact, right ? 0 : 1);
      });
      // and below 1/√2 the plant already resonates alone: no K can switch it off
      const already = [0.2, 0.5, 0.7].every((m) =>
        [0.1, 1, 10].every((K) => Number.isFinite(obs({ m, K }).mrDb.value))
      );
      return {
        ok: gap < 1e-13 && already,
        detail: `threshold K = 2m²−1 exact (0.125 at m = 0.75, 0.62 at m = 0.9)`,
      };
    },
  },
  {
    name: 'the drawn contours satisfy |L/(1+L)| = M to machine precision',
    category: 'numeric',
    run() {
      const gap = maxGap([-12, -6, -3, -1, 0, 1, 3, 6, 12], (db) => {
        const M = 10 ** (db / 20);
        let w = 0;
        for (let phi = -179.5; phi <= -0.5; phi += 0.5) {
          for (const r of isoModulus(M, phi)) {
            const a = (phi * Math.PI) / 180;
            const [re, im] = [r * Math.cos(a), r * Math.sin(a)];
            w = Math.max(w, Math.abs(Math.hypot(re, im) / Math.hypot(1 + re, im) - M));
          }
        }
        return w;
      });
      return { ok: gap < 1e-12, detail: `max gap ${gap.toExponential(2)}` };
    },
  },
  standardChecks.determinism(compute, BASE, 'stepClosed'),
];
