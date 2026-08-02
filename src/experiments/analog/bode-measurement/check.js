import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const RC = { system: 'rc', fc: 500, f0: 500, Q: 2, f: 100, sigma: 0.05, seed: 3 };

export const checks = [
  {
    name: 'noise-free bench: the LS fit equals the theory to machine precision',
    category: 'numeric',
    run() {
      // uniform sampling over an integer number of periods → the sin/cos
      // basis is exactly orthogonal and the fit is exact at σ = 0
      let worst = 0;
      for (const [system, f] of [['rc', 137], ['rc', 2000], ['order2', 480], ['order2', 3000]]) {
        const { observables: o } = compute({ ...RC, system, f, sigma: 0 });
        worst = Math.max(
          worst,
          Math.abs(o.gMeasDb.value - o.gThDb.value),
          Math.abs(o.phMeasDeg.value - o.phThDeg.value)
        );
      }
      return { ok: worst < 1e-9, detail: `max gap=${worst.toExponential(2)} (dB/°)` };
    },
  },
  {
    name: 'RC at f = fc: gain −3.0103 dB and phase −45° exactly',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...RC, f: 500, sigma: 0 });
      const gGap = Math.abs(o.gMeasDb.value - -10 * Math.log10(2));
      const pGap = Math.abs(o.phMeasDeg.value - -45);
      return {
        ok: gGap < 1e-9 && pGap < 1e-9,
        detail: `gain=${o.gMeasDb.value.toFixed(6)} dB, phase=${o.phMeasDeg.value.toFixed(6)}°`,
      };
    },
  },
  {
    name: 'resonant peak: value Q/√(1−1/(4Q²)) at fr = f0·√(1−1/(2Q²))',
    category: 'numeric',
    run() {
      const Q = 5;
      const fr = 500 * Math.sqrt(1 - 1 / (2 * Q * Q));
      const peakTh = 20 * Math.log10(Q / Math.sqrt(1 - 1 / (4 * Q * Q)));
      const { observables: o } = compute({ ...RC, system: 'order2', Q, f: fr, sigma: 0 });
      const gap = Math.abs(o.gMeasDb.value - peakTh);
      return { ok: gap < 1e-9, detail: `peak=${o.gMeasDb.value.toFixed(6)} dB vs ${peakTh.toFixed(6)}` };
    },
  },
  {
    name: 'noisy campaign: every measured gain within 4.5 standard errors',
    category: 'statistical',
    run() {
      // LS amplitude estimate: std = σ·√(2/N); in dB the error scales by
      // (20/ln10)/|H| — 4.5σ over 25 points keeps the false-alarm rate ~1e-4
      const sigma = 0.05;
      const N = 400;
      const { observables: o } = compute({ ...RC, sigma, seed: 11 });
      const se = sigma * Math.sqrt(2 / N);
      let worst = 0;
      for (let i = 0; i < o.gainMeas.x.length; i++) {
        const gTh = 10 ** (interp(o.gainTheory, o.gainMeas.x[i]) / 20);
        const seDb = ((20 / Math.LN10) * se) / gTh;
        worst = Math.max(worst, Math.abs(o.gainMeas.y[i] - interp(o.gainTheory, o.gainMeas.x[i])) / seDb);
      }
      return { ok: worst < 4.5, detail: `worst normalized error=${worst.toFixed(2)}σ` };
    },
  },
  standardChecks.determinism(compute, RC, 'gainMeas'),
];

/** Linear interpolation of a {x, y} series (x sorted). */
function interp(s, x) {
  let i = 1;
  while (i < s.x.length - 1 && s.x[i] < x) i++;
  const t = (x - s.x[i - 1]) / (s.x[i] - s.x[i - 1]);
  return s.y[i - 1] + t * (s.y[i] - s.y[i - 1]);
}
