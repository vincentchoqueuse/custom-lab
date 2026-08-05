import { coeffs, float, select } from '../../../core/fields.js';
import { vline } from '../../../core/views.js';
import { timeView, impulseView, spectrumView } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'fir-taps',
  order: 1,
  title: 'The FIR filter',
  subtitle:
    'Type the coefficients: the time, impulse and frequency responses follow',
  tags: ['digital', 'FIR', 'moving average', 'convolution'],

  params: {
    b: coeffs('b', {
      description: 'coefficients b₀…b_M (y[n] = Σ b_k·x[n−k])',
      default: [0.25, 0.25, 0.25, 0.25],
      maxLen: 12,
    }),
    source: select('source', {
      description: 'periodic input signal',
      options: [
        { value: 'square', label: 'square' },
        { value: 'saw', label: 'sawtooth' },
      ],
      default: 'square',
    }),
    f0: float('f₀', {
      description: 'fundamental of the signal',
      min: 50,
      max: 400,
      step: 1,
      default: 125,
      unit: 'Hz',
      precision: 0,
    }),
  },

  views: [
    timeView(),
    impulseView({ source: 'taps', x: 'k', y: 'b[k] = h[k]' }),
    spectrumView({
      overlays: [
        vline((p) => 8000 / p.b.length, {
          color: '#EDB120',
          dashed: true,
          label: 'Fs/L',
        }),
      ],
    }),
  ],
};
