import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { f: 5, A: 1, phi: 0, sigma: 0.3, step: 0.05, seed: 17 };

export const checks = [
  {
    name: 'zero noise: the argmin lands on the grid point nearest f (±Δf/2)',
    category: 'numeric',
    run() {
      // grid quantization is the ONLY error source at σ = 0
      let worst = 0;
      for (const step of [0.01, 0.1, 0.4]) {
        const { observables: o } = compute({ ...BASE, sigma: 0, step });
        worst = Math.max(worst, o.errHat.value / (step / 2));
      }
      return { ok: worst <= 1 + 1e-9, detail: `max err/(Δf/2)=${worst.toFixed(3)}` };
    },
  },
  {
    name: 'evaluation count: nEvals = ⌊(FMAX−FMIN)/Δf⌋ + 1',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, step: 0.05 });
      const expected = Math.floor(19 / 0.05) + 1;
      return {
        ok: o.nEvals.value === expected && o.gridPts.x.length === expected,
        detail: `nEvals=${o.nEvals.value} (expected ${expected})`,
      };
    },
  },
  {
    name: 'a step wider than the 1/T basin can miss the global minimum',
    category: 'numeric',
    run() {
      // with Δf = 1.3 Hz and this seed the grid straddles the true basin:
      // the estimate must land in ANOTHER basin (> 0.5 Hz away) — the
      // pedagogical failure mode of scene 2
      const { observables: o } = compute({ ...BASE, step: 1.3 });
      return { ok: o.errHat.value > 0.5, detail: `|f̂−f|=${o.errHat.value.toFixed(3)} Hz` };
    },
  },
  {
    name: 'moderate noise, fine grid: f̂ within 0.05 Hz of f',
    category: 'statistical',
    run() {
      // the CRB at this SNR is ≈ 0.017 Hz; 0.05 covers ~3 standard errors
      // on top of the 0.005 quantization floor (step 0.01)
      const { observables: o } = compute({ ...BASE, step: 0.01 });
      return { ok: o.errHat.value < 0.05, detail: `|f̂−f|=${o.errHat.value.toFixed(4)} Hz` };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'costCurve'),
];
