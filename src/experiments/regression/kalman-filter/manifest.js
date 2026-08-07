import { log, int } from '../../../core/fields.js';
import { view, line, scatter, band, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'kalman-filter',
  order: 6,
  random: true,
  title: 'The Kalman filter',
  subtitle: 'Recursive estimation: predict, correct, and know by how much you are wrong',
  tags: ['Kalman', 'recursive estimation', 'Riccati'],

  doc: `A state followed through noise, and an estimate that stays inside a ±3σ
tube — a tube that does not move when the data are redrawn, because it does
not depend on them: the covariance recursion runs on the model alone. How
the filter knows how wrong it is, without ever knowing the truth, is the
question the experiment turns on.

The gain K is the dial between trusting the sensor and trusting the model,
and the two extreme scenes show both regimes: an excellent sensor drives K∞
toward 1 and the estimate sticks to the measurements; a poor one drives K∞
toward 0 and the estimate is heavily smoothed, lagging behind every turn.
Nobody sets K by hand — the Riccati recursion computes it from the two noise
variances, which is the point of the theory.

The consistency view is the property that makes Kalman usable rather than
merely optimal. The true error, unobservable in practice, lives inside the
tube the filter predicted on its own, with roughly one point in 370 outside,
as a Gaussian says. The filter returns an estimate together with a
trustworthy error bar — and the second half is the valuable one.`,


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
        label: 'measured error',
        overlays: [
          band('errTube', { color: '#D95319', opacity: 0.15, label: '±3σ predicted' }),
          hline(() => 0, { color: '#EDB120', dashed: true }),
        ],
        axes: { x: 'k', y: 'error x̂ − x' },
      })
    ),
  ],
};
