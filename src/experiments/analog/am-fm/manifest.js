import { float, select } from '../../../core/fields.js';
import { view, line, scatter } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'am-fm',
  title: 'Modulations AM et FM',
  subtitle: 'Bandes latérales, raies de Bessel et règle de Carson',
  tags: ['analogique', 'AM', 'FM', 'Bessel', 'Carson', 'modulation'],

  params: {
    mode: select('mode', {
      description: 'type de modulation (porteuse 1 kHz)',
      options: [
        { value: 'am', label: 'AM' },
        { value: 'fm', label: 'FM' },
      ],
      default: 'am',
    }),
    fm: float('f_m', {
      description: 'fréquence du message',
      min: 20,
      max: 200,
      step: 0.5,
      default: 62.5,
      unit: 'Hz',
      precision: 1,
    }),
    ka: float('k_a', {
      description: "indice de modulation AM (surmodulation au-delà de 1)",
      min: 0,
      max: 1.5,
      step: 0.05,
      default: 0.5,
      precision: 2,
      visibleIf: { mode: 'am' },
    }),
    beta: float('β', {
      description: 'indice de modulation FM (extinction de porteuse à 2.405)',
      min: 0.1,
      max: 8,
      step: 0.005,
      default: 1,
      precision: 3,
      visibleIf: { mode: 'fm' },
    }),
  },

  views: [
    view(
      'time',
      'Temporel',
      line('sig', {
        overlays: [
          line('envUp', { color: '#D95319', dashed: true, label: 'enveloppe' }),
          line('envDown', { color: '#D95319', dashed: true }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 's(t)' },
      })
    ),
    view(
      'spectrum',
      'Spectre',
      line('spectrum', {
        label: 'mesuré',
        overlays: [scatter('theoryLines', { color: '#D95319', size: 3.5, label: 'théorie' })],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|S(f)|', unit: 'dB', domain: [-70, 5] },
        },
      })
    ),
  ],
};
