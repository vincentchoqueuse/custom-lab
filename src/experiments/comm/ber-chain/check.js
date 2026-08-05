import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { mod: 'qpsk', mapping: 'gray', ebn0Db: 5, Nbits: 40000, seed: 29 };

const popcount = (v) => {
  let c = 0;
  for (let x = v; x > 0; x >>= 1) c += x & 1;
  return c;
};

export const checks = [
  {
    // Same claim as in `constellations`, and it has to hold here too: the time
    // figure and the plane are ONE draw seen two ways. Checked by exact float
    // identity, because a trace from a second run would be indistinguishable
    // by eye and wrong by construction.
    name: 'the time trace and the constellation are the SAME symbols',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, mod: '16qam', Nbits: 20000 });
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
    name: 'Gray property: every adjacent pair of symbols differs by exactly 1 bit',
    category: 'numeric',
    run() {
      // ring adjacency for PSK, grid adjacency (distance-nearest) for QAM
      let ok = true;
      for (const mod of ['qpsk', '8psk', '16qam']) {
        const { observables: o } = compute({ ...BASE, mod, Nbits: 1000 });
        const bits = o.bitLabels;
        const { x, y } = o.idealPoints;
        // adjacent = pairs at the minimal non-zero distance
        let dMin = Infinity;
        for (let i = 0; i < x.length; i++) {
          for (let j = i + 1; j < x.length; j++) {
            dMin = Math.min(dMin, (x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2);
          }
        }
        for (let i = 0; i < x.length; i++) {
          for (let j = i + 1; j < x.length; j++) {
            const d = (x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2;
            if (d < dMin * 1.01) {
              const diff = popcount(parseInt(bits[i], 2) ^ parseInt(bits[j], 2));
              if (diff !== 1) ok = false;
            }
          }
        }
      }
      return { ok, detail: 'qpsk, 8psk, 16qam ring/grid neighbors' };
    },
  },
  {
    name: 'natural mapping violates the 1-bit property somewhere',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, mod: '16qam', mapping: 'natural', Nbits: 1000 });
      const bits = o.bitLabels;
      const { x, y } = o.idealPoints;
      let worst = 0;
      for (let i = 0; i < x.length; i++) {
        for (let j = i + 1; j < x.length; j++) {
          const d = (x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2;
          if (d < 0.41) {
            worst = Math.max(worst, popcount(parseInt(bits[i], 2) ^ parseInt(bits[j], 2)));
          }
        }
      }
      return { ok: worst >= 2, detail: `worst neighbor distance = ${worst} bits` };
    },
  },
  {
    name: 'BPSK BER matches Q(√(2γb)) at 5 dB (N = 40000 bits)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, mod: 'bpsk' });
      const p = o.berTh.value;
      const se = Math.sqrt((p * (1 - p)) / BASE.Nbits);
      const err = Math.abs(o.berEmp.value - p);
      return { ok: err < 4 * se, detail: `|Δ|=${err.toFixed(5)} < ${(4 * se).toFixed(5)}` };
    },
  },
  {
    name: 'QPSK equals BPSK in BER vs Eb/N₀ (the two-orthogonal-BPSK result)',
    category: 'statistical',
    run() {
      const b = compute({ ...BASE, mod: 'bpsk' }).observables.berEmp.value;
      const q = compute({ ...BASE, mod: 'qpsk' }).observables.berEmp.value;
      const p = compute({ ...BASE }).observables.berTh.value;
      const se = Math.sqrt((p * (1 - p)) / BASE.Nbits);
      return { ok: Math.abs(b - q) < 6 * se, detail: `|Δ|=${Math.abs(b - q).toFixed(5)}` };
    },
  },
  {
    name: '16-QAM Gray BER tracks (3/4)·Q(√(0.8γb)) at 8 dB (10% relative)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, mod: '16qam', ebn0Db: 8, Nbits: 80000 });
      const rel = Math.abs(o.berEmp.value - o.berTh.value) / o.berTh.value;
      return { ok: rel < 0.1, detail: `rel Δ=${(rel * 100).toFixed(1)}%` };
    },
  },
  {
    name: 'natural mapping costs bits: BER(natural) > 1.3·BER(Gray), 16-QAM @ 8 dB',
    category: 'statistical',
    run() {
      const g = compute({ ...BASE, mod: '16qam', ebn0Db: 8, Nbits: 80000 }).observables.berEmp.value;
      const n = compute({ ...BASE, mod: '16qam', mapping: 'natural', ebn0Db: 8, Nbits: 80000 })
        .observables.berEmp.value;
      return { ok: n > 1.3 * g, detail: `natural=${n.toFixed(4)} vs gray=${g.toFixed(4)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'berEmpCurve'),
];
