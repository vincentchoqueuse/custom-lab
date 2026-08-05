import { float, int, select, readonly } from '../../../core/fields.js';
import { view, custom, histogram, line, density, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'confidence-intervals',
  order: 6,
  random: true,
  title: 'Confidence intervals',
  subtitle: 'Frequentist coverage and the width of the interval',
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
        { value: false, label: 'no — Student interval' },
        { value: true, label: 'yes — Gaussian interval' },
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
        overlays: [
          density('theoreticalDensity', { color: '#D95319' }),
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
