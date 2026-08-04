import { float, int } from '../../../core/fields.js';
import { view, histogram, line, scatter, vline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'uniform-bound',
  order: 3,
  random: true,
  title: 'Estimating the bound of a uniform',
  subtitle: 'X ~ U[0, θ]: max, max+min or 2x̄ — three estimators of θ',
  tags: ['estimator', 'bias', 'MSE', 'uniform', 'order statistic'],

  params: {
    theta: float('θ', { description: 'true upper bound', min: 0.5, max: 10, step: 0.1, default: 5 }),
    N: int('N', { description: 'sample size', min: 2, max: 200, default: 10 }),
    M: int('M', {
      description: 'number of repeated experiments',
      min: 100,
      max: 20000,
      step: 100,
      default: 3000,
    }),
    // no seed here: injected by the core
  },

  derived: {
    biasMax: { label: 'bias of the max = −θ/(N+1)', calc: (p) => (-p.theta / (p.N + 1)).toFixed(3) },
    ratio: {
      label: 'MSE(2x̄)/MSE(max) = (N+1)(N+2)/6N',
      calc: (p) => (((p.N + 1) * (p.N + 2)) / (6 * p.N)).toFixed(2),
    },
  },

  groups: [
    { title: 'Model', params: ['theta'] },
    { title: 'Repeated sampling', params: ['N', 'M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // One concrete sample: the data rug and where the three candidates land.
    view(
      'realization',
      'One realization',
      scatter('samplePoints', {
        color: '#0072BD',
        size: 4,
        opacity: 0.75,
        label: 'sample',
        overlays: [
          vline('est1', { color: '#D95319', width: 2, label: 'max' }),
          vline('est2', { color: '#77AC30', width: 2, label: 'max+min' }),
          vline('est3', { color: '#7E2F8E', width: 2, label: '2x̄' }),
          vline((p) => p.theta, { color: '#EDB120', dashed: true, width: 2, label: 'θ' }),
        ],
        // Legend on the LEFT: the three estimators necessarily land near θ,
        // hence on the right of the frame, exactly where the legend sits by
        // default — it used to cover them. On the left there is only the rug.
        legend: 'left',
        // The y axis measures nothing: the points sit on a single line, and
        // graduating it would invite a reading that does not exist.
        // The x axis STARTS AT 0, because the support is [0, θ]: a frame
        // starting at the smallest sample suggests the estimators are aiming
        // at the edge of a floating interval. The upper end stays automatic —
        // 2x̄ can exceed θ (up to 2θ at N = 2), and pinning it would have cut
        // the estimator out of the frame.
        axes: {
          x: { label: 'x', domain: [0, null] },
          y: { label: 'sample', domain: [0, 1], ticks: false },
        },
      })
    ),

    // An estimator IS a random variable: the three sampling distributions.
    figure(
      'sampling',
      histogram('t1', {
        color: '#D95319',
        opacity: 0.55,
        label: 'max',
        overlays: [
          histogram('t2', { color: '#77AC30', opacity: 0.5, label: 'max+min' }),
          histogram('t3', { color: '#7E2F8E', opacity: 0.45, label: '2x̄' }),
          vline((p) => p.theta, { color: '#EDB120', dashed: true, width: 2, label: 'θ' }),
        ],
        axes: { x: 'estimator value', y: 'density' },
      })
    ),

    // The punchline in log-log: 1/N (order statistics) vs 1/√N (CLT).
    view(
      'rmse',
      'RMSE vs N',
      line('rmseN1', {
        color: '#D95319',
        width: 2.2,
        label: 'max',
        overlays: [
          line('rmseN2', { color: '#77AC30', width: 2.2, label: 'max+min' }),
          line('rmseN3', { color: '#7E2F8E', width: 2.2, label: '2x̄' }),
          line('rmseTh1', { color: '#D95319', width: 1.4, dashed: true, label: 'θ√(2/(N+1)(N+2))' }),
          line('rmseTh3', { color: '#7E2F8E', width: 1.4, dashed: true, label: 'θ/√(3N)' }),
        ],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'RMSE', scale: 'log' } },
      })
    ),
  ],
};
