import { float, int } from '../../../core/fields.js';
import { view, histogram, line, vline, hline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'variance-estimators',
  order: 2,
  random: true,
  title: 'Bias and variance of an estimator',
  subtitle: 'Two estimators of σ²: divide by N or by N−1?',
  tags: ['estimator', 'bias', 'variance', 'sampling distribution'],

  params: {
    mu: float('μ', { description: 'true mean', min: -5, max: 5, step: 0.1, default: 0 }),
    sigma: float('σ', { description: 'true standard deviation', min: 0.5, max: 3, step: 0.1, default: 1.5 }),
    N: int('N', { description: 'size of each sample', min: 2, max: 100, default: 5 }),
    M: int('M', {
      description: 'number of repeated experiments',
      min: 100,
      max: 20000,
      step: 100,
      default: 2000,
    }),
    // no seed here: injected by the core
  },

  derived: {
    biasTh: { label: 'bias of σ̂² = −σ²/N', calc: (q) => (-(q.sigma ** 2) / q.N).toFixed(4) },
    factor: { label: '(N−1)/N', calc: (q) => ((q.N - 1) / q.N).toFixed(3) },
  },

  groups: [
    { title: 'Population', params: ['mu', 'sigma'] },
    { title: 'Repeated sampling', params: ['N', 'M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // An estimator IS a random variable: its sampling distribution, M times.
    figure(
      'sampling',
      histogram('v1', {
        color: '#D95319',
        opacity: 0.55,
        label: 'σ̂² (÷N)',
        overlays: [
          histogram('v2', { color: '#0072BD', opacity: 0.5, label: 's² (÷N−1)' }),
          vline((q) => q.sigma * q.sigma, { color: '#EDB120', dashed: true, width: 2, label: 'σ²' }),
          vline('meanV1', { color: '#D95319', dashed: true, width: 1.6 }),
          vline('meanV2', { color: '#0072BD', dashed: true, width: 1.6 }),
        ],
        axes: { x: 'estimator value', y: 'density' },
      })
    ),

    view(
      'bias',
      'Bias vs N',
      line('biasEmp1', {
        color: '#D95319',
        width: 2.2,
        label: 'bias of σ̂² (÷N)',
        overlays: [
          line('biasEmp2', { color: '#0072BD', width: 2.2, label: 'bias of s² (÷N−1)' }),
          line('biasTh1', { color: '#D95319', width: 1.6, dashed: true, label: '−σ²/N' }),
          hline(() => 0, { color: '#a1a1aa', width: 1 }),
        ],
        axes: { x: { label: 'N', scale: 'log' }, y: 'empirical bias' },
      })
    ),
  ],
};
