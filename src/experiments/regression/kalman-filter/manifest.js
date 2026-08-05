import { log, int } from '../../../core/fields.js';
import { view, line, scatter, band, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'kalman-filter',
  order: 5,
  random: true,
  title: 'The Kalman filter',
  subtitle: 'Recursive estimation: predict, correct, and know by how much you are wrong',
  tags: ['Kalman', 'recursive estimation', 'Riccati'],

  params: {
    sigw: log('σw', {
      description: 'process-noise standard deviation (drift)',
      min: 0.001,
      max: 1,
      default: 0.1,
      precision: 3,
    }),
    sigv: log('σv', {
      description: 'measurement-noise standard deviation',
      min: 0.01,
      max: 10,
      default: 1,
      precision: 2,
    }),
    N: int('N', { description: 'number of steps', min: 20, max: 500, default: 120 }),
  },

  views: [
    view(
      'tracking',
      'Tracking',
      line('trueState', {
        label: 'true state',
        overlays: [
          band('tube', { color: '#D95319', opacity: 0.15, label: '±3σ' }),
          scatter('meas', { color: '#7E2F8E', size: 2, opacity: 0.5, label: 'measurements' }),
          line('est', { color: '#D95319', width: 2, label: 'estimate' }),
        ],
        axes: { x: 'k', y: 'x' },
      })
    ),
    view(
      'kgain',
      'Kalman gain',
      line('gains', {
        overlays: [hline('kInf', { color: '#EDB120', dashed: true, label: 'K∞' })],
        axes: { x: 'k', y: 'Kₖ' },
      })
    ),
    view(
      'consistency',
      'Consistency ±3σ',
      scatter('err', {
        size: 2,
        overlays: [
          band('errTube', { color: '#D95319', opacity: 0.15, label: '±3σ predicted' }),
          hline(() => 0, { color: '#EDB120', dashed: true }),
        ],
        axes: { x: 'k', y: 'error x̂ − x' },
      })
    ),
  ],
};
