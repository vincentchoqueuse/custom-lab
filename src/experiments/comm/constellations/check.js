import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { mod: 'qpsk', snrDb: 8, N: 20000, seed: 29 };

export const checks = [
  {
    name: 'every constellation has unit average energy exactly',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const mod of ['bpsk', 'qpsk', '8psk', '16qam']) {
        const { observables: o } = compute({ ...BASE, mod, N: 100 });
        const { x, y } = o.idealPoints;
        let e = 0;
        for (let i = 0; i < x.length; i++) e += x[i] ** 2 + y[i] ** 2;
        worst = Math.max(worst, Math.abs(e / x.length - 1));
      }
      return { ok: worst < 1e-12, detail: `max|E−1|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'no errors at very high SNR (decision recovers every symbol)',
    category: 'numeric',
    run() {
      let total = 0;
      for (const mod of ['qpsk', '16qam']) {
        total += compute({ ...BASE, mod, snrDb: 30 }).observables.nErrors.value;
      }
      return { ok: total === 0, detail: `${total} errors at 30 dB` };
    },
  },
  {
    name: 'QPSK SER matches 2p − p², p = Q(√γ), at 8 dB (N = 20000)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE });
      const p = o.serTh.value;
      const se = Math.sqrt((p * (1 - p)) / BASE.N);
      const err = Math.abs(o.serEmp.value - p);
      return { ok: err < 4 * se, detail: `|Δ|=${err.toFixed(5)} < ${(4 * se).toFixed(5)}` };
    },
  },
  {
    name: '16-QAM SER matches 1 − (1−p)², p = 1.5·Q(√(γ/5)), at 12 dB',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, mod: '16qam', snrDb: 12 });
      const p = o.serTh.value;
      const se = Math.sqrt((p * (1 - p)) / BASE.N);
      const err = Math.abs(o.serEmp.value - p);
      return { ok: err < 4 * se, detail: `|Δ|=${err.toFixed(5)} < ${(4 * se).toFixed(5)}` };
    },
  },
  {
    name: 'Monte Carlo SER curve tracks theory wherever errors are countable',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ ...BASE, mod: '16qam' });
      // compare only where theory predicts ≥ ~30 expected errors per point
      let worst = 0;
      for (let g = 0; g < o.serEmpCurve.x.length; g++) {
        const th = o.serTheoryCurve.y[Math.round((o.serEmpCurve.x[g] / 20) * 80)];
        if (th * 6000 < 30) continue;
        worst = Math.max(worst, Math.abs(o.serEmpCurve.y[g] - th) / th);
      }
      return { ok: worst < 0.25, detail: `worst rel Δ=${(worst * 100).toFixed(1)}%` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'rxOk'),
];
