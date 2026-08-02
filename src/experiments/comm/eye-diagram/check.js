import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { levels: 2, alpha: 0.35, bt: 8, sigma: 0, Nsym: 400, seed: 29 };

export const checks = [
  {
    name: 'Nyquist: noiseless samples sit on the levels (wide channel)',
    category: 'numeric',
    run() {
      // residual error: raised-cosine truncation + 1st-order channel at B·T=8
      const { observables: o } = compute({ ...BASE });
      let worst = 0;
      for (let k = 0; k < o.sampleValues.length; k++) {
        worst = Math.max(worst, Math.abs(Math.abs(o.sampleValues[k]) - 1));
      }
      return { ok: worst < 0.06, detail: `max|Δ|=${worst.toFixed(4)}` };
    },
  },
  {
    name: 'clean 2-PAM eye is wide open: opening ≈ 2 at the instant',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      const v = o.opening.value;
      return { ok: v > 1.85 && v <= 2.01, detail: `opening=${v.toFixed(3)}` };
    },
  },
  {
    name: '4-PAM opening is one third of the 2-PAM one (adjacent levels 2/3 apart)',
    category: 'numeric',
    run() {
      const two = compute({ ...BASE }).observables.opening.value;
      const four = compute({ ...BASE, levels: 4 }).observables.opening.value;
      const ratio = four / two;
      return { ok: Math.abs(ratio - 1 / 3) < 0.05, detail: `ratio=${ratio.toFixed(3)}` };
    },
  },
  {
    name: 'a narrow channel closes the eye: opening(B·T=0.4) ≪ opening(B·T=8)',
    category: 'numeric',
    run() {
      const wide = compute({ ...BASE }).observables.opening.value;
      const narrow = compute({ ...BASE, bt: 0.4 }).observables.opening.value;
      return {
        ok: narrow < 0.3 * wide,
        detail: `${narrow.toFixed(3)} < 0.3·${wide.toFixed(3)}`,
      };
    },
  },
  {
    name: 'noise shrinks the opening by about 2·(max excursion): σ = 0.05',
    category: 'statistical',
    run() {
      const clean = compute({ ...BASE }).observables.opening.value;
      const noisy = compute({ ...BASE, sigma: 0.05 }).observables.opening.value;
      // max of ~400 gaussians ≈ 3σ on each side of each cluster
      const shrink = clean - noisy;
      return {
        ok: shrink > 0.15 && shrink < 0.45,
        detail: `shrink=${shrink.toFixed(3)} (attendu ≈ 6σ = 0.30)`,
      };
    },
  },
  standardChecks.determinism(compute, { ...BASE }, 'sampleValues'),
];
