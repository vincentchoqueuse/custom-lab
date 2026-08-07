import { float, int, select, readonly } from '../../../core/fields.js';
import { view, custom, histogram, line, density, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'confidence-intervals',
  order: 6,
  random: true,
  title: 'Confidence intervals',
  subtitle: 'Frequentist coverage and the width of the interval',
  // The prose the info panel (I) shows.
  doc: `A confidence interval is the estimate that admits what it does not know:
not "μ is 5.1" but "μ is somewhere in [4.4, 5.8]", with a level attached to the
claim. This experiment draws M independent samples, builds an interval from each
one, and colours the ones that miss.

The question to hold on to is what the level is a statement ABOUT. It is not
the probability that μ lies in the interval you are looking at — μ is fixed and
the interval either contains it or does not. It is the frequency with which the
PROCEDURE succeeds, over the draws you did not make. That is the whole of the
frequentist reading, and it is visible here as a proportion of red lines.

Two knobs separate two things a room routinely confuses. N changes the WIDTH
and leaves the coverage alone: more data buys precision, not confidence. 1−α
changes the coverage and the width together: you may demand more certainty and
pay for it in vagueness. Nothing you can do makes an interval both narrower and
surer, and that trade is the point.

Whether σ is known decides which law the interval is built from — Gaussian if
it is, Student with N−1 degrees of freedom if it is not. Keeping 1.96 with an
estimated σ would use the data twice, once for x̄ and once for σ̂, and the
coverage would fall below the level; Student's t is exactly the price of the
second use. At N = 30 the two laws differ by two percent and nobody would
notice; at N = 5 the Student quantile is 2.78 against 1.96, forty percent
wider. And once each law is used where it belongs, the coverage curve is flat
in N for both: a correct interval does not become more correct with more
data — it becomes narrower.`,

  tags: ['frequentist', 'interval', 'Student'],

  params: {
    mu: float('μ', { description: 'true mean', min: 0, max: 10, step: 0.1, default: 5 }),
    sigma: float('σ', { description: 'standard deviation', min: 0.5, max: 5, step: 0.1, default: 2 }),
    N: int('N', { description: 'sample size', min: 2, max: 200, default: 30 }),
    M: int('M', { description: 'number of intervals', min: 10, max: 100, default: 40 }),
    conf: float('1−α', {
      description: 'target confidence level',
      min: 0.8,
      max: 0.99,
      step: 0.01,
      default: 0.95,
      precision: 2,
    }),
    known: select('σ known?', {
      description: 'which interval the model justifies',
      options: [
        { value: false, label: 'Student' },
        { value: true, label: 'Gaussian' },
      ],
      default: false,
    }),
    dof: readonly('ν', {
      description: 'degrees of freedom',
      visibleIf: { known: false },
      calc: (p) => p.N - 1,
    }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (p) => p.N < 2, message: 'N must be ≥ 2' },
    { when: (p) => p.M * p.N > 1e7, message: 'M×N too large to stay responsive' },
  ],

  derived: {
    meanVariance: { label: 'σ²/N', calc: (p) => (p.sigma ** 2 / p.N).toFixed(3) },
  },

  groups: [
    { title: 'Model', params: ['mu', 'sigma', 'known', 'dof'] },
    { title: 'Sampling', params: ['N', 'M', 'conf'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // CUSTOM view — justification: the M stacked horizontal CI segments with
    // per-interval hit/miss coloring fit no generic plot type.
    custom('realizations', 'Realizations', () => import('./views/Realizations.svelte')),

    view(
      'distribution',
      'Distribution of x̄',
      histogram('means', {
        label: 'x̄ over M samples',
        overlays: [
          density('theoreticalDensity', { color: '#D95319', label: 'theory N(μ, σ²/N)' }),
          vline('mu', { color: '#EDB120', dashed: true, label: 'μ' }),
        ],
        axes: { x: 'x̄', y: 'frequency' },
      })
    ),

    view(
      'coverage',
      'Coverage vs N',
      line('coverageVsN', {
        overlays: [hline((p) => p.conf, { dashed: true, label: '1−α' })],
        axes: { x: 'N', y: 'empirical coverage' },
      })
    ),
  ],
};
