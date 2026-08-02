import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { fc: 1000, N: 45, win: 'rect', seed: 1 };

// tabulated highest stopband lobe of the window method (dB)
const SIDELOBE = { rect: -21, hann: -44, hamming: -53, blackman: -74 };

export const checks = [
  {
    name: 'taps are exactly symmetric (linear phase by construction)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, win: 'hamming' });
      let worst = 0;
      const h = o.hTaps;
      for (let n = 0; n < h.length; n++) {
        worst = Math.max(worst, Math.abs(h[n] - h[h.length - 1 - n]));
      }
      return { ok: worst < 1e-15, detail: `max|h[n]−h[N−1−n]|=${worst.toExponential(1)}` };
    },
  },
  {
    name: 'DC gain Σh ≈ 1 (windowed sinc, no normalization hidden)',
    category: 'numeric',
    run() {
      // an approximation, not an identity: the truncated sinc tails leave a
      // percent-level bias (largest for rect, which keeps the ripply tails)
      let worst = 0;
      for (const win of ['rect', 'hann', 'hamming', 'blackman']) {
        const { observables: o } = compute({ ...BASE, N: 81, win });
        worst = Math.max(worst, Math.abs(o.dcGain.value - 1));
      }
      return { ok: worst < 0.03, detail: `max|Σh−1|=${worst.toExponential(2)}` };
    },
  },
  {
    name: 'stopband lobes at the tabulated levels (−21/−44/−53/−74 dB)',
    category: 'numeric',
    run() {
      let detail = '';
      let ok = true;
      for (const win of ['rect', 'hann', 'hamming', 'blackman']) {
        const { observables: o } = compute({ ...BASE, win });
        const gap = Math.abs(o.sidelobe.value - SIDELOBE[win]);
        ok = ok && gap < 2.5;
        detail += `${win}:${o.sidelobe.value.toFixed(1)} `;
      }
      return { ok, detail: detail.trim() + ' dB' };
    },
  },
  {
    name: 'Gibbs does not yield to N: rect lobe stays ≈ −21 dB from N=21 to 101',
    category: 'numeric',
    run() {
      const a = compute({ ...BASE, N: 21 }).observables.sidelobe.value;
      const b = compute({ ...BASE, N: 101 }).observables.sidelobe.value;
      return {
        ok: Math.abs(a - -21) < 2.5 && Math.abs(b - -21) < 2.5,
        detail: `N=21: ${a.toFixed(1)} dB, N=101: ${b.toFixed(1)} dB`,
      };
    },
  },
  {
    name: 'group delay: the output lags the input by exactly (N−1)/2 samples',
    category: 'numeric',
    run() {
      // an 81-tap filter spans a full period of the 100 Hz square, so no
      // "flat top" survives — the robust delay statement is the argmax of
      // the input/output cross-correlation, which must land on M exactly
      const { observables: o } = compute({ fc: 500, N: 81, win: 'hamming', seed: 1 });
      const xin = o.sqIn.y;
      const yout = o.sqOut.y;
      let best = 0;
      let bestC = -Infinity;
      for (let d = 0; d <= 80; d++) {
        let c = 0;
        for (let n = 200; n < 640; n++) c += yout[n] * xin[n - d];
        if (c > bestC) {
          bestC = c;
          best = d;
        }
      }
      return { ok: best === 40, detail: `argmax corr at d=${best} (M=40)` };
    },
  },
  standardChecks.determinism(compute, BASE, 'response'),
];
