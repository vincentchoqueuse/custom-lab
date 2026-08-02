import { float, log, select } from '../../../core/fields.js';
import { view, line, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'svf',
  order: 5,
  title: "Le filtre à variable d'état (SVF)",
  subtitle: 'Un signal périodique sculpté — quatre filtres pour deux multiplications',
  tags: ['numérique', 'SVF', 'résonance', 'harmoniques', 'synthèse'],

  params: {
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
      default: 110,
      unit: 'Hz',
      precision: 0,
    }),
    fc: log('f_c', {
      description: 'fréquence de coupure du SVF (Fs = 8 kHz)',
      min: 100,
      max: 1500,
      default: 500,
      unit: 'Hz',
      precision: 0,
    }),
    Q: log('Q', {
      description: 'facteur de résonance',
      min: 0.5,
      max: 20,
      default: 2,
      precision: 2,
    }),
    output: select('sortie', {
      description: 'sortie du SVF (les quatre existent simultanément)',
      options: [
        { value: 'lp', label: 'passe-bas' },
        { value: 'bp', label: 'passe-bande' },
        { value: 'hp', label: 'passe-haut' },
        { value: 'notch', label: 'coupe-bande (notch)' },
      ],
      default: 'lp',
    }),
  },

  validate: [
    {
      // the REAL stability boundary of the Chamberlin structure: the poles
      // leave the unit circle when f1·(f1 + 2/Q) ≥ 4 — high fc + low Q
      when: (p) => {
        const f1 = 2 * Math.sin((Math.PI * p.fc) / 8000);
        return f1 * f1 + (2 * f1) / p.Q >= 3.92;
      },
      message: 'SVF de Chamberlin instable ici : f₁·(f₁ + 2/Q) ≥ 4 — baisser f_c ou monter Q (sa limite historique, résolue par les SVF trapézoïdaux)',
    },
  ],

  views: [
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
    view(
      'spectrum',
      'Fréquentiel',
      line('specOut', {
        width: 1.8,
        label: 'sortie',
        overlays: [
          line('specIn', { color: '#7E2F8E', opacity: 0.45, label: 'entrée' }),
          line('respSel', { color: '#D95319', dashed: true, label: '|H(f)|' }),
          vline('fc', { color: '#EDB120', dashed: true, label: 'f_c' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: 'amplitude', unit: 'dB', domain: [-80, 30] },
        },
      })
    ),
    view(
      'outputs',
      'Une structure, quatre filtres',
      line('respLp', {
        label: 'passe-bas',
        overlays: [
          line('respBp', { color: '#D95319', label: 'passe-bande' }),
          line('respHp', { color: '#7E2F8E', label: 'passe-haut' }),
          line('respNotch', { color: '#77AC30', label: 'notch' }),
          vline('fc', { color: '#EDB120', dashed: true, label: 'f_c' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|H|', unit: 'dB', domain: [-40, 30] },
        },
      })
    ),
  ],
};
