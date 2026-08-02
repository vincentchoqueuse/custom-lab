import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { code: 'hamming74', ebn0Db: 5, Nbits: 40000, seed: 29 };

export const checks = [
  {
    name: 'Hamming (7,4) corrects every single-error pattern (β₀ = β₁ = 0)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, Nbits: 1000 });
      const b = o.betaByWeight.y;
      return {
        ok: b[0] === 0 && b[1] === 0 && b[2] > 0,
        detail: `β₀=${b[0]}, β₁=${b[1]}, β₂=${b[2].toFixed(3)}`,
      };
    },
  },
  {
    name: 'exact theory is quadratic at small p (single errors are free)',
    category: 'numeric',
    run() {
      // BER(p)/p² must converge: compare at 8 and 10 dB, ratio within 5%
      const y = (db) => {
        const { observables: o } = compute({ ...BASE, ebn0Db: db, Nbits: 1000 });
        return o.berOutTh.value / o.pCh.value ** 2;
      };
      const r8 = y(8);
      const r10 = y(10);
      const rel = Math.abs(r8 - r10) / r10;
      return { ok: rel < 0.05, detail: `BER/p² = ${r8.toFixed(2)} → ${r10.toFixed(2)}` };
    },
  },
  {
    name: 'Monte Carlo matches the exact enumeration at 5 dB (4 SE)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, Nbits: 100000 });
      const p = o.berOutTh.value;
      const se = Math.sqrt((p * (1 - p)) / 100000);
      const err = Math.abs(o.berOut.value - p);
      return { ok: err < 4 * se, detail: `|Δ|=${err.toFixed(5)} < ${(4 * se).toFixed(5)}` };
    },
  },
  {
    name: 'the crossover: Hamming loses at 0 dB, wins at 8 dB (exact theory)',
    category: 'numeric',
    run() {
      const lo = compute({ ...BASE, ebn0Db: 0, Nbits: 1000 }).observables;
      const hi = compute({ ...BASE, ebn0Db: 8, Nbits: 1000 }).observables;
      const qU = (o, i) => o.berUncodedTh.y[i];
      // grid index: 0 dB → 0, 8 dB → 32 (49 points over 12 dB)
      const loses = lo.berCodedTh.y[0] > qU(lo, 0);
      const wins = hi.berCodedTh.y[32] < qU(hi, 32);
      return {
        ok: loses && wins,
        detail: `0 dB: ${lo.berCodedTh.y[0].toExponential(2)} > ${qU(lo, 0).toExponential(2)}; 8 dB: ${hi.berCodedTh.y[32].toExponential(2)} < ${qU(hi, 32).toExponential(2)}`,
      };
    },
  },
  {
    name: 'repetition ×3 never beats uncoded BPSK (hard decision, whole grid)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, code: 'repetition3', Nbits: 1000 });
      let ok = true;
      for (let i = 0; i < o.berCodedTh.x.length; i++) {
        if (o.berCodedTh.y[i] < o.berUncodedTh.y[i]) ok = false;
      }
      return { ok, detail: 'coded ≥ uncoded on all 49 grid points' };
    },
  },
  {
    name: 'repetition ×3 exact theory equals 3p² − 2p³ (majority closed form)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, code: 'repetition3', Nbits: 1000 });
      const p = o.pCh.value;
      const closed = 3 * p * p - 2 * p ** 3;
      const err = Math.abs(o.berOutTh.value - closed);
      return { ok: err < 1e-12, detail: `|Δ|=${err.toExponential(2)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'berCodedMc'),
];
