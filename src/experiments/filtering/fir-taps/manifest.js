import { coeffs, float, select } from '../../../core/fields.js';
import { vline } from '../../../core/views.js';
import { timeView, impulseView, spectrumView } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'fir-taps',
  order: 1,
  title: 'Filtre RIF',
  subtitle:
    "Tapez les coefficients : la réponse temporelle, l'impulsionnelle et la fréquentielle suivent",
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
