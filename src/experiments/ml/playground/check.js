// The harness of the playground: the Bayes risk of the blobs is a closed
// form, the capacity ladder is measured over seeds exactly as xor measured
// its forty draws, and the doc quotes the numbers found here.
import { compute, BLOB_C, BLOB_D } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { qfunc } from '../../../core/numeric.js';

const P = (over = {}) => ({
  dataset: 'circle',
  hidden: 4,
  act: 'tanh',
  lr: 0.4,
  epoch: 3000,
  sigma: 0.2,
  seed: 34,
  ...over,
});

/** Test accuracy at full training, one seed. */
const acc = (over) => compute(P(over)).observables.accTest.value;

export const checks = [
  {
    name: 'blobs: the error brackets the Bayes rate — neither beaten nor missed',
    category: 'statistical',
    run() {
      // symmetric isotropic blobs: Bayes error = Q(‖c₁−c₀‖/2σ) — at σ = 0.9
      // that is Q(1.367) ≈ 0.0859, large enough for BOTH directions of the
      // theorem to be testable on 600 pooled test points (3 seeds × 200):
      // no classifier beats Bayes beyond sampling error, and this one has to
      // reach it (a 0.02 learning slack on the high side, none on the low).
      const d = Math.hypot(2 * BLOB_C, 2 * BLOB_D);
      const bayes = qfunc(d / (2 * 0.9));
      let errors = 0;
      for (const seed of [11, 12, 13])
        errors += (1 - acc({ dataset: 'blobs', hidden: 2, sigma: 0.9, seed })) * 200;
      const err = errors / 600;
      const se = Math.sqrt((bayes * (1 - bayes)) / 600);
      const ok = err >= bayes - 4 * se && err <= bayes + 4 * se + 0.02;
      return { ok, detail: `err=${err.toFixed(4)} vs bayes=${bayes.toFixed(4)} ± ${(4 * se).toFixed(4)}` };
    },
  },
  {
    name: 'the capacity ladder, measured over 6 seeds: circle needs width',
    category: 'statistical',
    run() {
      // the cliff, not perfection: H = 1 must NEVER reach 90 % (a line on a
      // ring cannot), H = 4 on at least five seeds of six — seed 1 lands at
      // 0.775, a genuine bad valley of the non-convex landscape, and hiding
      // it would unteach the very lesson the spiral scene measures
      let h1 = 0;
      let h4 = 0;
      for (let s = 1; s <= 6; s++) {
        if (acc({ hidden: 1, seed: s }) >= 0.9) h1++;
        if (acc({ hidden: 4, seed: s }) >= 0.9) h4++;
      }
      return { ok: h1 === 0 && h4 >= 5, detail: `H=1: ${h1}/6 · H=4: ${h4}/6` };
    },
  },
  {
    name: 'the spiral keeps its reputation: H = 2 never, H = 8 always (6 seeds)',
    category: 'statistical',
    run() {
      let h2 = 0;
      let h8 = 0;
      for (let s = 1; s <= 6; s++) {
        if (acc({ dataset: 'spiral', hidden: 2, seed: s }) >= 0.9) h2++;
        if (acc({ dataset: 'spiral', hidden: 8, seed: s }) >= 0.9) h8++;
      }
      return { ok: h2 === 0 && h8 === 6, detail: `H=2: ${h2}/6 · H=8: ${h8}/6` };
    },
  },
  {
    name: 'the descent descends: final train loss below a tenth of the initial, all datasets',
    category: 'numeric',
    run() {
      let worst = Infinity;
      for (const dataset of ['blobs', 'circle', 'xor', 'spiral']) {
        const { observables: o } = compute(P({ dataset, hidden: 8 }));
        const y = o.trainCurve.y;
        worst = Math.min(worst, y[0] / Math.max(y[y.length - 1], 1e-12));
      }
      return { ok: worst > 10, detail: `worst initial/final ratio = ${worst.toFixed(1)}` };
    },
  },
  {
    name: 'the epoch dial replays the film: accuracy at epoch 0 is chance, at 3000 it is not',
    category: 'numeric',
    run() {
      const start = compute(P({ epoch: 0 })).observables.accTest.value;
      const end = compute(P({ epoch: 3000 })).observables.accTest.value;
      return {
        ok: Math.abs(start - 0.5) < 0.2 && end > 0.9,
        detail: `epoch 0: ${start.toFixed(2)} → epoch 3000: ${end.toFixed(2)}`,
      };
    },
  },
  {
    name: 'noise separates the curves: test loss ends above train loss at σ = 0.65',
    category: 'statistical',
    run() {
      const { observables: o } = compute(P({ sigma: 0.65, hidden: 8 }));
      const tr = o.trainCurve.y[o.trainCurve.y.length - 1];
      const te = o.testCurve.y[o.testCurve.y.length - 1];
      return { ok: te > 1.15 * tr, detail: `train=${tr.toFixed(4)} test=${te.toFixed(4)}` };
    },
  },
  standardChecks.determinism(compute, P(), 'trainCurve'),
];
