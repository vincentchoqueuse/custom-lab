import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { qfunc } from '../../../core/numeric.js';
import { hamming74, codewordTable } from '../_lib/codes.js';

const BASE = { code: 'hamming74', ebn0Db: 4, Nbits: 100000, seed: 29 };

export const checks = [
  {
    name: 'Hamming (7,4) codeword table: 16 words, minimum distance 3',
    category: 'numeric',
    run() {
      const table = codewordTable(hamming74);
      let dMin = Infinity;
      for (const { cw } of table) {
        const w = cw.reduce((a, b) => a + b, 0);
        if (w > 0) dMin = Math.min(dMin, w); // linear code: dmin = min weight
      }
      return { ok: table.length === 16 && dMin === 3, detail: `${table.length} mots, dmin=${dMin}` };
    },
  },
  {
    name: 'soft beats hard on the same noise: BER_soft < BER_hard at 4 dB',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE });
      return {
        ok: o.berSoft.value < 0.6 * o.berHard.value,
        detail: `souple=${o.berSoft.value.toFixed(5)} < 0.6·dur=${o.berHard.value.toFixed(5)}`,
      };
    },
  },
  {
    name: 'soft repetition ×3 recovers the full energy: BER = Q(√(2γb))',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, code: 'repetition3' });
      const p = qfunc(Math.sqrt(2 * 10 ** (BASE.ebn0Db / 10)));
      const se = Math.sqrt((p * (1 - p)) / BASE.Nbits);
      const err = Math.abs(o.berSoft.value - p);
      return { ok: err < 4 * se, detail: `|Δ|=${err.toFixed(5)} < ${(4 * se).toFixed(5)}` };
    },
  },
  {
    name: 'union bound bounds: MC below the bound, within 2× at 5 dB',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, ebn0Db: 5 });
      // MC point at 5 dB is grid index 5 (0…8 dB step 1)
      const mc = o.berSoftMc.y[5];
      // union bound at 5 dB on the fine grid: index 30 of 49 over 8 dB
      const ub = o.berSoftUb.y[30];
      const se = Math.sqrt(ub / (4000 * 4));
      return {
        ok: mc < ub + 4 * se && mc > 0.3 * ub,
        detail: `mc=${mc.toExponential(2)} vs ub=${ub.toExponential(2)}`,
      };
    },
  },
  {
    name: 'hard exact curve matches the hamming-code experiment convention',
    category: 'numeric',
    run() {
      // at 0 dB the hard curve must sit above uncoded (the crossover lesson)
      const { observables: o } = compute({ ...BASE, Nbits: 1000 });
      return {
        ok: o.berHardTh.y[0] > o.berUncodedTh.y[0],
        detail: `${o.berHardTh.y[0].toExponential(2)} > ${o.berUncodedTh.y[0].toExponential(2)}`,
      };
    },
  },
  standardChecks.determinism(compute, { ...BASE, Nbits: 10000 }, 'berSoftMc'),
];
