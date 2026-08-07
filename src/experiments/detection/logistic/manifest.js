import { float, int, log } from '../../../core/fields.js';
import { view, plane, stack, line, scatter, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'logistic',
  // Last of the module, and it is the bridge out: Neyman–Pearson knows both
  // densities, the matched filter knows the signal, the GLRT knows it up to a
  // few parameters — and this one knows nothing at all except a pile of
  // labelled examples. The rung after it is the machine-learning subject.
  order: 5,
  random: true, // both sets are drawn
  title: 'Logistic classification',
  subtitle: 'The likelihood ratio, learned from examples instead of derived',
  tags: ['classification', 'logistic', 'likelihood ratio', 'ROC', 'IRLS', 'calibration', 'LDA'],

  doc: `A classifier and a detector are the same machine. For two Gaussian
classes with the SAME covariance, the exact log-likelihood ratio is affine in
the observation, so the posterior P(H₁|x) is a sigmoid of a linear form — which
is precisely what logistic regression postulates. The method is therefore not a
new object: it is the Neyman–Pearson test in which the ratio is ESTIMATED from
labelled data rather than derived from a known model.

The experiment makes that claim falsifiable. One dial, v, stretches class 1
without changing its volume: at v = 1 the postulate is exactly true and the
learned detector converges to the clairvoyant one; above it the true boundary
becomes a conic, the affine model is misspecified, and the gap between the two
ROC curves stops closing however much data is supplied. That contrast is the
difference between two kinds of error — variance goes away with data,
misspecification does not.

The posterior view reads the same fit as a probability: test points binned
along the score, the observed fraction of class 1 in each bin against the
σ(t) the model claims. At v = 1 the dots sit on the curve — the model is
calibrated, a property most classifiers lack — and the threshold is
Neyman–Pearson's γ read on a probability scale, with the prior absorbed into
the intercept: changing π₁ translates the sigmoid without bending it, and the
ROC does not move. Above v = 1 the dots leave the curve, and the misspecified
model is not merely suboptimal — it misreports its own confidence.

The last scene breaks the easy case. When the two classes are separable the
maximum-likelihood estimate does not exist: doubling w strictly improves any
candidate, so ‖w‖ diverges while the cost heads to zero. A ridge penalty
restores a strictly convex objective and a finite optimum — the real argument
for regularization is not that it generalizes better but that without it the
estimate is not there. Separability is a small-sample accident, which is
exactly when a perfect training score is most tempting.`,

  params: {
    d: float('d', {
      description: 'separation between the two class means',
      min: 0.5,
      max: 6,
      step: 0.1,
      default: 2.5,
      precision: 1,
    }),
    // The misspecification dial. det Σ₁ = v · 1/v = 1 for every v, so turning
    // it changes the SHAPE of class 1 and not its volume: what moves is the
    // boundary, not the amount of overlap.
    v: float('v', {
      description: 'anisotropy of class 1 — at 1 the two covariances are equal',
      min: 1,
      max: 3,
      step: 0.05,
      default: 1,
      precision: 2,
    }),
    N: int('N', { description: 'labelled training points', min: 20, max: 1000, default: 200 }),
    prior: float('π₁', {
      description: 'prior probability of class 1',
      min: 0.05,
      max: 0.95,
      step: 0.05,
      default: 0.5,
      precision: 2,
    }),
    lam: log('λ', {
      description: 'ridge penalty on the slopes — the intercept is never penalized',
      min: 1e-12,
      max: 10,
      default: 1e-12,
    }),
    thresh: float('τ', {
      description: 'decision threshold on the posterior — the P_FA dial',
      min: 0.02,
      max: 0.98,
      step: 0.01,
      default: 0.5,
      precision: 2,
    }),
    k: int('k', {
      description: 'IRLS iteration observed — the dial that replaces an animation',
      min: 1,
      max: 60,
      default: 25,
    }),
    // seed injected by the core, because random: true
  },

  validate: [
    {
      // IRLS has nothing to fit if one of the classes is nearly empty, and the
      // Hessian then leans entirely on the ridge term.
      when: (p) => p.N * Math.min(p.prior, 1 - p.prior) < 5,
      message: 'N × min(π₁, 1−π₁) must be ≥ 5 — each class needs a few points',
    },
  ],

  derived: {
    // What the room can check in its head: at v = 1 the deflection is exactly
    // the separation, and the clairvoyant AUC is Φ(d/√2) — a number to compare
    // with the statline before touching anything.
    deflection: { label: "d' = ‖μ₁−μ₀‖ (at v = 1)", calc: (p) => p.d.toFixed(2) },
    pfaEq: { label: 'τ as a log-odds threshold', calc: (p) => Math.log(p.thresh / (1 - p.thresh)).toFixed(2) },
  },

  groups: [
    { title: 'The two classes', params: ['d', 'v', 'prior'] },
    { title: 'Data', params: ['N'] },
    { title: 'Fit', params: ['lam', 'k'] },
    { title: 'Decision', params: ['thresh'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // THE ROC COMES FIRST, and that is deliberate — it inverts this subject's
    // usual grammar, where the densities lead. Every other catalogue puts the
    // scatter plot of the two clouds first, and doing that here would make this
    // a statistics experiment that happens to sit in a detection module. The
    // ROC is the module's own figure: the same axes as Neyman–Pearson and the
    // GLRT, carrying a new pair of curves. The gap between them IS the price of
    // not knowing the densities, and it is the one thing this experiment adds
    // to the three before it.
    //
    // Linear axes, where the neighbours use log–log: their P_FA lives at 1e-6
    // because that is where radar lives, and this experiment's τ is a prior
    // trade-off around 0.1–0.5. A log axis here would mostly display the
    // sampling noise of a finite test set.
    view(
      'roc',
      'ROC curve',
      line('rocBayes', {
        color: '#D95319',
        width: 2.5,
        label: 'clairvoyant LRT — knows the densities',
        overlays: [
          line('rocLearned', { color: '#0072BD', width: 2.5, label: 'logistic — learned from N examples' }),
          line('chance', { color: '#a1a1aa', width: 1.4, dashed: true, label: 'chance' }),
          scatter('opLearned', { color: '#EDB120', size: 6, label: 'operating point at τ' }),
        ],
        axes: {
          x: { label: 'P_FA', domain: [0, 1] },
          y: { label: 'P_D', domain: [0, 1.02] },
        },
      })
    ),

    // The geometry. Equal aspect, because the metric of this problem is Σ⁻¹ and
    // a stretched axis would make a boundary look perpendicular to a direction
    // it is not perpendicular to.
    plane('plane', 'The two classes', {
      clouds: [
        { source: 'class0', color: '#0072BD', r: 3.2, opacity: 0.55, label: 'class 0 (training)' },
        { source: 'class1', color: '#D95319', r: 3.2, opacity: 0.55, label: 'class 1 (training)' },
      ],
      curves: [
        { source: 'bayesBoundary', color: '#EDB120', width: 2.4, label: 'Bayes boundary (exact)' },
        { source: 'learnedBoundary', color: '#7E2F8E', width: 2.4, dashed: true, label: 'learned boundary' },
      ],
      minHalf: (p) => p.d / 2 + 3.6 * Math.max(1, Math.sqrt(p.v)),
      axisLines: true,
      symmetric: false,
      axes: { x: 'x₁', y: 'x₂' },
    }),

    // WHAT THE MODEL CLAIMS, against what the data does. The curve is σ(t), the
    // dots are the measured fraction of class 1 in fourteen equal-count bins of
    // t. When the log-ratio really is affine they coincide; when it is not, the
    // dots leave the curve, and that departure is the misspecification made
    // visible on a quantity — the posterior — rather than on a boundary.
    view(
      'posterior',
      'The posterior along w',
      line('sigmoidCurve', {
        color: '#0072BD',
        width: 2.5,
        label: 'σ(wᵀx + b) — what the model claims',
        overlays: [
          scatter('calibration', { color: '#D95319', size: 6, label: 'measured fraction of class 1' }),
          scatter('rug', { color: '#71717a', size: 2, opacity: 0.35, label: 'test points' }),
          vline('threshT', { color: '#EDB120', dashed: true, width: 1.8, label: 'τ' }),
          hline((p) => p.thresh, { color: '#EDB120', dashed: true, width: 1.2 }),
        ],
        axes: { x: { label: 'wᵀx + b' }, y: { label: 'P(H₁ | x)', domain: [-0.05, 1.05] } },
      })
    ),

    // The fit itself, over one iteration axis. Two panels because the two
    // curves answer different questions and share nothing but the abscissa:
    // above, the cost Newton is minimizing; below, the size of what it found.
    // The separable scene is entirely in the lower panel — the cost keeps
    // falling towards zero while ‖w‖ leaves for infinity, which is what "the
    // maximum likelihood does not exist" looks like.
    stack(
      'irls',
      'Cost and coefficients',
      [
        line('nllPath', {
          color: '#0072BD',
          width: 2.2,
          label: 'cross-entropy per point',
          overlays: [vline((p) => p.k, { color: '#71717a', dashed: true, width: 1.2, label: 'iteration k' })],
          axes: { y: { label: 'NLL / N' } },
        }),
        line('wPath', {
          color: '#7E2F8E',
          width: 2.2,
          label: '‖w‖',
          overlays: [vline((p) => p.k, { color: '#71717a', dashed: true, width: 1.2 })],
          axes: { y: { label: '‖w‖', scale: 'log' } },
        }),
      ],
      { axes: { x: { label: 'IRLS iteration' } } }
    ),
  ],
};
