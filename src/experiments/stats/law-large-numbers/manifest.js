import { float, int, select } from '../../../core/fields.js';
import { view, line, band, hline } from '../../../core/views.js';
import { canonicalLaws } from '../_lib/laws.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'law-large-numbers',
  order: 4,
  random: true,
  title: 'Law of large numbers',
  subtitle: 'Every path of x̄ₙ converges to μ — at speed 1/√n',
  tags: ['LLN', 'convergence', 'sample mean', 'paths'],

  params: {
    law: select('distribution', {
      description: 'distribution of the individual draws',
      options: [
        { value: 'dice', label: '6-sided die' },
        { value: 'uniform', label: 'Uniform U(0, 1)' },
        { value: 'exponential', label: 'Exponential' },
        { value: 'bernoulli', label: 'Bernoulli(p)' },
      ],
      default: 'dice',
    }),
    n: int('n', {
      description: 'horizon (final sample size)',
      min: 100,
      max: 10000,
      step: 100,
      default: 2000,
    }),
    K: int('K', { description: 'number of paths', min: 1, max: 20, default: 5 }),
    p: float('p', {
      description: 'success probability',
      min: 0.05,
      max: 0.95,
      step: 0.05,
      default: 0.5,
      precision: 2,
      visibleIf: { law: 'bernoulli' },
    }),
    // no seed here: injected by the core
  },

  derived: {
    precision: {
      label: 'σ/√n at the horizon',
      calc: (q) => Math.sqrt(canonicalLaws[q.law].variance(q) / q.n).toFixed(4),
    },
  },

  groups: [
    { title: 'Draws', params: ['law', 'p'] },
    { title: 'Paths', params: ['n', 'K'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // Fully declarative — the funnel band is the main layer (under the
    // paths); the K running means are packed in ONE series with
    // NaN separators (the line primitive breaks segments on non-finite
    // values). Log x axis: convergence is a story told over decades.
    view(
      'trajectories',
      'Paths of x̄ₙ',
      band('funnel', {
        color: '#EDB120',
        opacity: 0.22,
        label: 'μ ± 2σ/√n',
        overlays: [
          line('trajectories', { width: 1.6, opacity: 0.85, label: 'x̄ₙ (K paths)' }),
          hline('meanTh', { color: '#D95319', width: 2, label: 'μ' }),
        ],
        axes: { x: { label: 'n', scale: 'log' }, y: 'x̄ₙ' },
      })
    ),
  ],
};
