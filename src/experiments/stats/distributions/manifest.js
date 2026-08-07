import { float, int, select } from '../../../core/fields.js';
import { view, custom, line } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'distributions',
  order: 1,
  random: true,
  title: 'A catalogue of distributions',
  subtitle: 'pdf/pmf and CDF: theory against draws',
  tags: ['probability', 'distributions', 'histogram', 'CDF', 'Poisson', 'Gaussian'],

  doc: `A distribution met three ways: as draws, as a density, and as a cumulative
curve. The blue histogram shivers around the orange density at N = 100 — every
draw is a different histogram of the same distribution — and settles onto it at
ten thousand, which is the law of large numbers seen directly. The statline
carries the same story in numbers: x̄ against E[X], s² against Var(X).

On a discrete distribution the blue bars are observed frequencies and the
orange ones probabilities, and the two never match exactly: one is measured,
the other is a model, and only an infinite sample would close the gap. A
binomial with n large and p small wears the same silhouette as the Poisson —
the classic limit, easier to believe as a superposition than as algebra.

The sampled CDF is a staircase whose every step is exactly 1/N: countable at
N = 10, invisible at ten thousand. None of it depends on which distribution
the pill selects, and that is the point.`,

  params: {
    law: select('distribution', {
      description: 'probability distribution',
      options: [
        { value: 'uniform', label: 'Uniform U(a, b)' },
        { value: 'gaussian', label: 'Gaussian' },
        { value: 'exponential', label: 'Exponential' },
        { value: 'rayleigh', label: 'Rayleigh(σ)' },
        { value: 'bernoulli', label: 'Bernoulli(p)' },
        { value: 'binomial', label: 'Binomial' },
        { value: 'poisson', label: 'Poisson(λ)' },
      ],
      default: 'gaussian',
    }),
    N: int('N', { description: 'number of draws', min: 10, max: 10000, step: 10, default: 500 }),
    a: float('a', { description: 'lower bound', min: -5, max: 5, step: 0.1, default: 0, visibleIf: { law: 'uniform' } }),
    b: float('b', { description: 'upper bound', min: -5, max: 5, step: 0.1, default: 1, visibleIf: { law: 'uniform' } }),
    mu: float('μ', { description: 'mean', min: -5, max: 5, step: 0.1, default: 0, visibleIf: { law: 'gaussian' } }),
    sigma: float('σ', { description: 'scale parameter', min: 0.2, max: 3, step: 0.1, default: 1, visibleIf: { law: ['gaussian', 'rayleigh'] } }),
    lambda: float('λ', { description: 'rate', min: 0.2, max: 5, step: 0.1, default: 1.5, visibleIf: { law: ['exponential', 'poisson'] } }),
    p: float('p', { description: 'success probability', min: 0.05, max: 0.95, step: 0.05, default: 0.3, precision: 2, visibleIf: { law: ['bernoulli', 'binomial'] } }),
    n: int('n', { description: 'number of trials', min: 1, max: 30, default: 10, visibleIf: { law: 'binomial' } }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (q) => q.law === 'uniform' && q.a >= q.b, message: 'a must be less than b' },
  ],

  groups: [
    { title: 'Distribution', params: ['law', 'N'] },
    { title: 'Distribution parameters', params: ['a', 'b', 'mu', 'sigma', 'lambda', 'p', 'n'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // CUSTOM view — justification: the pdf panel switches representation with
    // the selected distribution (continuous: histogram bars + smooth theoretical
    // curve; discrete: paired sampled/theoretical bars on the integer support).
    // No single generic plot type covers both renderings.
    custom('pdf', 'pdf / pmf', () => import('./views/DistributionPdf.svelte')),

    view(
      'cdf',
      'Cumulative distribution',
      line('theoreticalCdf', {
        color: '#D95319',
        width: 2.5,
        label: 'theory',
        overlays: [
          line('empiricalCdf', { color: '#0072BD', width: 2, label: 'sampled' }),
        ],
        axes: { x: 'x', y: { label: 'F(x)', domain: [0, 1.05] } },
      })
    ),
  ],
};
