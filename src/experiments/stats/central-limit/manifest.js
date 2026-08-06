import { float, int, select } from '../../../core/fields.js';
import { view, bars, density } from '../../../core/views.js';
import { canonicalLaws } from '../_lib/laws.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'central-limit',
  order: 5,
  random: true,
  title: 'Central limit theorem',
  subtitle: 'The mean of n draws turns Gaussian — whatever the distribution',
  tags: ['CLT', 'convergence', 'Gaussian', 'mean'],

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
    n: int('n', { description: 'draws averaged per realization', min: 1, max: 200, default: 1 }),
    M: int('M', {
      description: 'number of means computed',
      min: 100,
      max: 20000,
      step: 100,
      default: 5000,
    }),
    p: float('p', {
      description: 'success probability',
      min: 0.05,
      max: 0.95,
      step: 0.05,
      default: 0.1,
      precision: 2,
      visibleIf: { law: 'bernoulli' },
    }),
    // no seed here: injected by the core
  },

  derived: {
    sdOfMean: {
      label: 'σ/√n',
      calc: (q) => Math.sqrt(canonicalLaws[q.law].variance(q) / q.n).toFixed(3),
    },
  },

  groups: [
    { title: 'Draws', params: ['law', 'p'] },
    { title: 'Averaging', params: ['n', 'M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // Fully declarative: binned density of the M means (edges aligned on the
    // discrete value grid by compute) + the CLT Gaussian N(μ, σ²/n) with the
    // SAME mean and the CORRECT variance.
    view(
      'clt',
      'Mean x̄ₙ',
      bars('meansPdf', {
        label: 'sample means',
        overlays: [
          density('gaussPdf', { color: '#D95319', width: 2.5, label: 'N(μ, σ²/n)' }),
        ],
        axes: { x: 'x̄ₙ', y: 'density' },
      })
    ),
  ],
};
