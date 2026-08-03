import { coeffs, float, select } from '../../../core/fields.js';
import { view, line, stem, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'fir-taps',
  order: 1,
  title: 'RIF à coefficients réglables',
  subtitle: 'Tapez les coefficients : impulsionnelle, sortie, spectre — les trois vues répondent',
  tags: ['numérique', 'RIF', 'FIR', 'moyenne glissante', 'convolution'],

  params: {
    b: coeffs('b', {
      description: 'coefficients b₀…b_M (y[n] = Σ b_k·x[n−k])',
      default: [0.25, 0.25, 0.25, 0.25],
      maxLen: 12,
    }),
    source: select('source', {
      description: "signal périodique d'entrée",
      options: [
        { value: 'square', label: 'carré' },
        { value: 'saw', label: 'dent de scie' },
      ],
      default: 'square',
    }),
    f0: float('f₀', {
      description: 'fondamentale du signal',
      min: 50,
      max: 400,
      step: 1,
      default: 125,
      unit: 'Hz',
      precision: 0,
    }),
  },

  views: [
    view(
      'impulse',
      'Réponse impulsionnelle',
      stem('taps', {
        axes: { x: 'k', y: 'b[k] = h[k]' },
      })
    ),
    view(
      'spectrum',
      'Fréquentiel',
      line('specOut', {
        width: 1.8,
        label: 'sortie',
        overlays: [
          line('specIn', { color: '#7E2F8E', opacity: 0.45, label: 'entrée' }),
          line('resp', { color: '#D95319', dashed: true, label: '|H(f)|' }),
          vline((p) => 8000 / p.b.length, {
            color: '#EDB120',
            dashed: true,
            label: 'Fs/L',
          }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: 'amplitude', unit: 'dB', domain: [-60, 20] },
        },
      })
    ),
    view(
      'time',
      'Temporel',
      line('tOut', {
        width: 1.8,
        label: 'sortie',
        overlays: [line('tIn', { color: '#D95319', dashed: true, label: 'entrée' })],
        axes: { x: { label: 't', unit: 'ms' }, y: 'x(t)' },
      })
    ),
  ],
};
