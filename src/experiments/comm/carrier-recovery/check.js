import { compute, detect, run, loopGains, wrap, orderOf } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { constellation } from '../_lib/modulation.js';

const BASE = {
  mod: 'qpsk', ebn0Db: 12, phi0: 35, dfreq: 0,
  algo: 'costas', blt: 0.005, zeta: 0.707, order: 2, block: 64, N: 6000, seed: 34,
};
const obs = (p) => compute({ ...BASE, ...p }).observables;

/** The NOISELESS detector characteristic, averaged over ALL M points — the
 *  definition, and exactly periodic where a finite noisy average is only
 *  nearly so. */
function characteristic(algo, mod, phi) {
  const pts = constellation(mod);
  let acc = 0;
  for (const p of pts) {
    const a = p.x * Math.cos(phi) - p.y * Math.sin(phi);
    const b = p.x * Math.sin(phi) + p.y * Math.cos(phi);
    acc += detect(algo, a, b, mod, pts);
  }
  return acc / pts.length;
}

export const checks = [
  {
    // THE theorem of the experiment: the detector cannot see which point was
    // sent, so its characteristic is periodic in 2π/M. Checked on the noiseless
    // definition rather than on the drawn curve, which is a finite average and
    // therefore only nearly periodic — the statement is about the detector, not
    // about a draw.
    name: 'the detector characteristic has period 2π/M, exactly',
    category: 'numeric',
    run() {
      const worst = maxGap(['costas', 'dd'], (algo) =>
        maxGap(['bpsk', 'qpsk', '8psk'], (mod) => {
          const M = orderOf(mod);
          // A PRIME number of points, offset by half a step, and neither is
          // cosmetic: a decision-directed characteristic is genuinely
          // DISCONTINUOUS at the decision boundaries, and asserting periodicity
          // across one would be asserting a tie-breaking rule rather than a
          // property of the detector. 120 points landed exactly on −157.5°,
          // which is an 8-PSK boundary; 127 lands on none of them.
          return maxGap(range(127), (i) => {
            const phi = -Math.PI + (2 * Math.PI * (i + 0.5)) / 127;
            return Math.abs(characteristic(algo, mod, phi) - characteristic(algo, mod, phi + (2 * Math.PI) / M));
          });
        })
      );
      return { ok: worst < 1e-12, detail: `worst |S(φ) − S(φ + 2π/M)| = ${worst.toExponential(2)}` };
    },
  },
  {
    // And the M zeros are LOCK points: S(0) = 0 and the slope through it is
    // positive, so a loop settles there rather than running away from it.
    name: 'S(0) = 0 and the slope through it drives the loop back',
    category: 'numeric',
    run() {
      const bad = [];
      for (const algo of ['costas', 'dd'])
        for (const mod of ['bpsk', 'qpsk', '8psk']) {
          const z = Math.abs(characteristic(algo, mod, 0));
          const h = 1e-4;
          const slope = (characteristic(algo, mod, h) - characteristic(algo, mod, -h)) / (2 * h);
          if (z > 1e-12 || slope <= 0) bad.push(`${algo}/${mod}: S(0)=${z.toExponential(1)} slope=${slope.toFixed(3)}`);
        }
      return { ok: bad.length === 0, detail: bad.join(' · ') || 'six detectors, all with a rising zero at φ = 0' };
    },
  },
  {
    // Viterbi & Viterbi with no noise must be EXACT: raising a PSK point to the
    // Mth power sends every one of them to the same angle, so the block average
    // carries the channel phase and nothing else.
    name: 'noiseless Viterbi & Viterbi returns the phase exactly',
    category: 'numeric',
    run() {
      const worst = maxGap(['bpsk', 'qpsk', '8psk'], (mod) =>
        maxGap([-40, 0, 17, 35], (phi0) => {
          const r = run({ ...BASE, mod, algo: 'vv', ebn0Db: 200, phi0, dfreq: 0, N: 512, block: 128 });
          const M = orderOf(mod);
          const amb = (2 * Math.PI) / M;
          let g = 0;
          for (let n = 0; n < 512; n++) {
            const e = r.est[n] - r.truth[n];
            g = Math.max(g, Math.abs(e - amb * Math.round(e / amb)));
          }
          return g;
        })
      );
      return { ok: worst < 1e-9, detail: `worst residual ${((worst * 180) / Math.PI).toExponential(2)} °` };
    },
  },
  {
    // A first-order loop cannot track a ramp: its static error is PROPORTIONAL
    // to the frequency offset. A second-order loop's integrator makes it zero.
    // Both statements without the detector gain, which depends on the
    // modulation and the SNR and is not worth predicting.
    name: 'first order: a static error proportional to Δf. Second order: none',
    category: 'numeric',
    run() {
      const P = { ...BASE, ebn0Db: 30, phi0: 0, blt: 0.003, N: 20000 };
      const b1 = obs({ ...P, order: 1, dfreq: 0.1 }).biasErr.value;
      const b2 = obs({ ...P, order: 1, dfreq: 0.2 }).biasErr.value;
      const s1 = obs({ ...P, order: 2, dfreq: 0.1 }).biasErr.value;
      const s2 = obs({ ...P, order: 2, dfreq: 0.2 }).biasErr.value;
      const ratio = b2 / b1;
      return {
        ok: Math.abs(ratio - 2) < 0.1 && Math.abs(s1) < 0.02 && Math.abs(s2) < 0.02,
        detail:
          `order 1: ${b1.toFixed(3)}° → ${b2.toFixed(3)}° (ratio ${ratio.toFixed(3)}) · ` +
          `order 2: ${s1.toFixed(4)}°, ${s2.toFixed(4)}°`,
      };
    },
  },
  {
    // The loop-bandwidth law every design decision in the field is made from:
    // σ²_φ = 1/(2ρ_L) with ρ_L = (Es/N₀)/(2 B_L T), so the jitter grows as the
    // SQUARE ROOT of the bandwidth — a slope of one half in log-log, measured
    // on the curve the fourth tab draws.
    name: 'the jitter grows as √(B_L·T), and lands on 1/√(2ρ_L)',
    category: 'statistical',
    run() {
      const j = obs({ algo: 'dd', ebn0Db: 15, N: 12000 });
      const x = j.jitterMeas.x;
      const y = j.jitterMeas.y;
      const t = j.jitterTheory.y;
      // least-squares slope of log σ against log B, over the whole sweep
      const n = x.length;
      let sx = 0;
      let sy = 0;
      let sxy = 0;
      let sxx = 0;
      for (let i = 0; i < n; i++) {
        const a = Math.log10(x[i]);
        const b = Math.log10(y[i]);
        sx += a;
        sy += b;
        sxy += a * b;
        sxx += a * a;
      }
      const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
      // and the level, where the loop is neither starved nor wide open
      const rel = maxGap(range(n - 3), (i) => Math.abs(y[i + 1] / t[i + 1] - 1));
      return {
        ok: Math.abs(slope - 0.5) < 0.08 && rel < 0.45,
        detail: `slope ${slope.toFixed(3)} (½) · worst relative gap to 1/√(2ρ_L): ${(100 * rel).toFixed(0)} %`,
      };
    },
  },
  {
    // The loop filter's gains are the standard normalisation, and a first-order
    // loop is the same expression with its integrator switched off — not a
    // different formula.
    name: 'the loop gains are Gardner’s normalisation, and order 1 drops K₂',
    category: 'numeric',
    run() {
      const worst = maxGap([0.001, 0.01, 0.05], (b) =>
        maxGap([0.5, 0.707, 1.5], (z) => {
          const g2 = loopGains(b, z, 2);
          const g1 = loopGains(b, z, 1);
          const t = b / (z + 1 / (4 * z));
          const d = 1 + 2 * z * t + t * t;
          return Math.max(
            Math.abs(g2.k1 - (4 * z * t) / d),
            Math.abs(g2.k2 - (4 * t * t) / d),
            Math.abs(g1.k1 - g2.k1),
            Math.abs(g1.k2)
          );
        })
      );
      return { ok: worst < 1e-15, detail: `worst gap ${worst.toExponential(2)}` };
    },
  },
  {
    // All three synchronizers must actually work at a workable SNR — measured
    // on the residual after correction, wrapped into one ambiguity slot, since
    // a lock onto a neighbouring point IS a lock.
    name: 'all three lock, on all three constellations',
    category: 'statistical',
    run() {
      const bad = [];
      for (const algo of ['costas', 'vv', 'dd'])
        for (const mod of ['bpsk', 'qpsk', '8psk']) {
          const r = obs({ algo, mod, ebn0Db: 15, phi0: 30 }).rmsErr.value;
          if (!(r < 6)) bad.push(`${algo}/${mod}: ${r.toFixed(2)}°`);
        }
      return { ok: bad.length === 0, detail: bad.join(' · ') || 'nine combinations, all under 6° RMS' };
    },
  },
  standardChecks.determinism(compute, BASE, 'phaseErr'),
];
