import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { mod: 'qpsk', mapping: 'gray', ebn0Db: 5, N: 20000, seed: 29 };

const popcount = (v) => {
  let c = 0;
  for (let x = v; x > 0; x >>= 1) c += x & 1;
  return c;
};

export const checks = [
  {
    // WHAT THE FIRST TWO TABS CLAIM ABOUT EACH OTHER. The scene says the plane
    // is the time figure with the time thrown away, and that is a statement
    // about the DATA and not a turn of phrase: every symbol drawn as a pair of
    // stems must be findable, to the last bit of the mantissa, among the points
    // of the cloud. A trace taken from a second draw, or offset by one index,
    // would look perfectly plausible on both tabs and be a different signal.
    name: 'the time trace and the plane are the SAME symbols',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, mod: '16qam', N: 3000 });
      const seen = new Set();
      for (const c of [o.rxOk, o.rxErr1, o.rxErrMulti])
        for (let i = 0; i < c.x.length; i++) seen.add(`${c.x[i]},${c.y[i]}`);
      let missing = 0;
      for (let i = 0; i < o.rxI.y.length; i++)
        if (!seen.has(`${o.rxI.y[i]},${o.rxQ.y[i]}`)) missing++;
      const ideal = new Set();
      for (let i = 0; i < o.idealPoints.x.length; i++)
        ideal.add(`${o.idealPoints.x[i]},${o.idealPoints.y[i]}`);
      let offGrid = 0;
      for (let i = 0; i < o.txI.y.length; i++)
        if (!ideal.has(`${o.txI.y[i]},${o.txQ.y[i]}`)) offGrid++;
      return {
        ok: missing === 0 && offGrid === 0 && o.rxI.y.length === 24,
        detail: `${o.rxI.y.length} symbols, ${missing} absent from the cloud, ${offGrid} off the constellation`,
      };
    },
  },
  {
    name: 'every constellation has unit average energy exactly',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const mod of ['bpsk', 'qpsk', '8psk', '16qam']) {
        const { observables: o } = compute({ ...BASE, mod, N: 200 });
        const { x, y } = o.idealPoints;
        let e = 0;
        for (let i = 0; i < x.length; i++) e += x[i] ** 2 + y[i] ** 2;
        worst = Math.max(worst, Math.abs(e / x.length - 1));
      }
      return { ok: worst < 1e-12, detail: `max|E−1|=${worst.toExponential(2)}` };
    },
  },
  {
    // Gray coding is a NUMBERING, and this is its definition — read off the
    // labels the plane actually draws, at the pairs of points the plane
    // actually puts side by side. Checking the property on the geometry rather
    // than on the generator is what makes it a check of the picture.
    name: 'Gray property: adjacent symbols differ by exactly 1 bit',
    category: 'numeric',
    run() {
      let ok = true;
      for (const mod of ['qpsk', '8psk', '16qam']) {
        const { observables: o } = compute({ ...BASE, mod, N: 200 });
        const bits = o.bitLabels;
        const { x, y } = o.idealPoints;
        // adjacent = the pairs at the minimal non-zero distance (ring for PSK,
        // grid for QAM), which is also where the errors actually happen
        let dMin = Infinity;
        for (let i = 0; i < x.length; i++)
          for (let j = i + 1; j < x.length; j++)
            dMin = Math.min(dMin, (x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2);
        for (let i = 0; i < x.length; i++)
          for (let j = i + 1; j < x.length; j++) {
            const d = (x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2;
            if (d < dMin * 1.01 && popcount(parseInt(bits[i], 2) ^ parseInt(bits[j], 2)) !== 1)
              ok = false;
          }
      }
      return { ok, detail: 'qpsk, 8psk, 16qam ring/grid neighbours' };
    },
  },
  {
    name: 'natural mapping violates the 1-bit property somewhere',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, mod: '16qam', mapping: 'natural', N: 200 });
      const bits = o.bitLabels;
      const { x, y } = o.idealPoints;
      let worst = 0;
      for (let i = 0; i < x.length; i++)
        for (let j = i + 1; j < x.length; j++) {
          const d = (x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2;
          if (d < 0.41)
            worst = Math.max(worst, popcount(parseInt(bits[i], 2) ^ parseInt(bits[j], 2)));
        }
      return { ok: worst >= 2, detail: `worst neighbouring pair = ${worst} bits` };
    },
  },
  {
    // THE MERGE'S OWN CLAIM, and the reason the two experiments became one: the
    // mapping is INVISIBLE to the decision and DECISIVE for the bits. The
    // receiver decides on geometry and has never heard of the labels, so at the
    // same seed the SER may not move by a single symbol; the BER must. Both
    // halves are asserted, because a compute that let the mapping leak into the
    // decision would draw exactly the same picture and be wrong about what a
    // mapping IS.
    name: 'the mapping moves the BER and leaves the SER alone',
    category: 'statistical',
    run() {
      const p = { ...BASE, mod: '16qam', ebn0Db: 8, N: 20000 };
      const g = compute(p).observables;
      const n = compute({ ...p, mapping: 'natural' }).observables;
      const serSame = g.serEmp.value === n.serEmp.value;
      const costs = n.berEmp.value > 1.3 * g.berEmp.value;
      return {
        ok: serSame && costs,
        detail:
          `SER ${g.serEmp.value.toFixed(4)} either way; ` +
          `BER ${g.berEmp.value.toFixed(4)} → ${n.berEmp.value.toFixed(4)}`,
      };
    },
  },
  {
    name: 'no errors at very high SNR (the decision recovers every symbol)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, ebn0Db: 14, N: 2000 });
      return { ok: o.nErrors.value === 0, detail: `${o.nErrors.value} symbol errors at 14 dB` };
    },
  },
  {
    name: 'BPSK BER matches Q(√(2γb)) at 5 dB',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, mod: 'bpsk' });
      const p = o.berTh.value;
      const se = Math.sqrt((p * (1 - p)) / BASE.N); // k = 1: one bit per symbol
      const err = Math.abs(o.berEmp.value - p);
      return { ok: err < 4 * se, detail: `|Δ|=${err.toFixed(5)} < ${(4 * se).toFixed(5)}` };
    },
  },
  {
    // The result that makes Eb/N₀ the honest axis, and the one a room never
    // quite believes until it is measured: QPSK is two orthogonal BPSKs sharing
    // the energy of one, so per BIT they cost exactly the same.
    name: 'QPSK equals BPSK in BER vs Eb/N₀',
    category: 'statistical',
    run() {
      const b = compute({ ...BASE, mod: 'bpsk' }).observables.berEmp.value;
      const q = compute({ ...BASE, mod: 'qpsk' }).observables.berEmp.value;
      const p = compute({ ...BASE }).observables.berTh.value;
      const se = Math.sqrt((p * (1 - p)) / BASE.N);
      return { ok: Math.abs(b - q) < 6 * se, detail: `|Δ|=${Math.abs(b - q).toFixed(5)}` };
    },
  },
  {
    name: 'QPSK SER matches 2p − p², p = Q(√γs), at 8 dB',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, ebn0Db: 8, N: 20000 });
      const p = o.serTh.value;
      const se = Math.sqrt((p * (1 - p)) / 20000);
      const err = Math.abs(o.serEmp.value - p);
      return { ok: err < 4 * se, detail: `|Δ|=${err.toFixed(5)} < ${(4 * se).toFixed(5)}` };
    },
  },
  {
    name: '16-QAM SER matches 1 − (1−p)², p = 1.5·Q(√(γs/5))',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, mod: '16qam', ebn0Db: 10, N: 20000 });
      const p = o.serTh.value;
      const se = Math.sqrt((p * (1 - p)) / 20000);
      const err = Math.abs(o.serEmp.value - p);
      return { ok: err < 4 * se, detail: `|Δ|=${err.toFixed(5)} < ${(4 * se).toFixed(5)}` };
    },
  },
  {
    // BOTH drawn curves, wherever the simulation can count what it is being
    // compared against. Below a handful of expected errors per point the Monte
    // Carlo has nothing to say, and asserting there would be asserting noise.
    name: 'both Monte Carlo curves track theory wherever errors are countable',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, mod: '16qam', ebn0Db: 8, N: 2000 });
      const bad = [];
      const at = (curve, db) => {
        let best = 0;
        for (let i = 0; i < curve.x.length; i++)
          if (Math.abs(curve.x[i] - db) < Math.abs(curve.x[best] - db)) best = i;
        return curve.y[best];
      };
      for (const [name, emp, th] of [
        ['SER', o.serEmpCurve, o.serTheoryCurve],
        ['BER', o.berEmpCurve, o.berTheoryCurve],
      ]) {
        for (let i = 0; i < emp.x.length; i++) {
          const t = at(th, emp.x[i]);
          if (t * 4000 < 20) continue; // fewer than 20 expected errors: no claim
          const rel = Math.abs(emp.y[i] - t) / t;
          if (rel > 0.3)
            bad.push(`${name} @${emp.x[i]}dB: ${emp.y[i].toExponential(2)} vs ${t.toExponential(2)}`);
        }
      }
      return { ok: bad.length === 0, detail: bad.slice(0, 2).join(' · ') || 'both curves on theory' };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'berEmpCurve'),
];
