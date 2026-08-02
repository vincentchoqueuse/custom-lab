import { int, float, bool } from '../../../core/fields.js';
import { view, line, histogram, density, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'quantization',
  order: 3,
  title: 'Quantification',
  subtitle: "L'escalier du CAN, son erreur, et la règle des 6 dB par bit",
  tags: ['numérique', 'CAN', 'quantification', 'SNR', 'dither'],

  params: {
    b: int('b', { description: 'nombre de bits', min: 1, max: 12, default: 8, unit: 'bits' }),
    A: float('A', {
      description: "amplitude relative à la pleine échelle",
      min: 0.05,
      max: 1,
      step: 0.01,
      default: 0.9,
      precision: 2,
    }),
    f: float('f', {
      description: 'fréquence du signal',
      min: 1,
      max: 20,
      step: 0.1,
      default: 7.3,
      unit: 'Hz',
      precision: 1,
    }),
    dither: bool('dither', {
      description: 'bruit uniforme ±Δ/2 ajouté AVANT quantification',
      default: false,
    }),
  },

  views: [
    view(
      'time',
      'Signal quantifié',
      line('quantT', {
        width: 1.5,
        label: 'quantifié',
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
        overlays: [density('errPdf', { label: 'uniforme ±Δ/2' })],
        axes: { x: 'erreur', y: 'densité' },
      })
    ),
    view(
      'snr',
      'SNR vs bits',
      line('snrCurve', {
        label: 'mesuré',
        overlays: [
          line('snrTh', { color: '#D95319', dashed: true, label: '6.02b + 1.76 + 20log₁₀A' }),
          vline('b', { color: '#EDB120', dashed: true, label: 'b' }),
        ],
        axes: { x: { label: 'b', unit: 'bits' }, y: { label: 'SNR', unit: 'dB' } },
      })
    ),
  ],
};
