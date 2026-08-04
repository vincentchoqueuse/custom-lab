import { int, float, bool } from '../../../core/fields.js';
import { view, line, histogram, density, vline, hline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'quantization',
  order: 3,
  random: true,
  title: 'Quantization',
  subtitle: 'The ADC staircase, its error, and the 6 dB per bit rule',
  tags: ['digital', 'ADC', 'quantization', 'SNR', 'dither'],

  params: {
    b: int('b', { description: 'number of bits', min: 1, max: 12, default: 8, unit: 'bits' }),
    A: float('A', {
      description: 'amplitude relative to full scale',
      min: 0.05,
      max: 1,
      step: 0.01,
      default: 0.9,
      precision: 2,
    }),
    f: float('f', {
      description: 'signal frequency',
      min: 1,
      max: 20,
      step: 0.1,
      default: 7.3,
      unit: 'Hz',
      precision: 1,
    }),
    dither: bool('dither', {
      description: 'uniform noise ±Δ/2 added BEFORE quantization',
      default: false,
    }),
  },

  views: [
    figure(
      'time',
      line('quantT', {
        width: 1.5,
        label: 'quantized',
        overlays: [line('cleanT', { color: '#D95319', dashed: true, label: 'signal' })],
        axes: { x: { label: 't', unit: 's' }, y: 'x' },
      })
    ),
    view(
      'error',
      "L'erreur",
      line('errT', {
        overlays: [
          hline((p) => 1 / 2 ** p.b, { color: '#EDB120', dashed: true, label: '+Δ/2' }),
          hline((p) => -1 / 2 ** p.b, { color: '#EDB120', dashed: true, label: '−Δ/2' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'e = q(x) − x' },
      })
    ),
    view(
      'error-hist',
      "Distribution de l'erreur",
      histogram('error', {
        overlays: [density('errPdf', { label: 'uniform ±Δ/2' })],
        axes: { x: 'erreur', y: 'densité' },
      })
    ),
    view(
      'snr',
      'SNR vs bits',
      line('snrCurve', {
        label: 'measured',
        overlays: [
          line('snrTh', { color: '#D95319', dashed: true, label: '6.02b + 1.76 + 20log₁₀A' }),
          vline('b', { color: '#EDB120', dashed: true, label: 'b' }),
        ],
        axes: { x: { label: 'b', unit: 'bits' }, y: { label: 'SNR', unit: 'dB' } },
      })
    ),
  ],
};
