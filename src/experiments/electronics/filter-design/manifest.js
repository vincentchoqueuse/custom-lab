import { float, select } from '../../../core/fields.js';
import { view, custom, line, band, vline } from '../../../core/views.js';
import { requiredOrder } from './compute.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'filter-design',
  title: 'Design de filtres analogiques',
  subtitle: "Un gabarit, quatre familles — l'ordre est un résultat, pas un choix",
  tags: ['analogique', 'filtre', 'Butterworth', 'Chebyshev', 'elliptique', 'gabarit'],
  group: 'Signaux analogiques',

  params: {
    family: select('famille', {
      description: "famille d'approximation",
      options: [
        { value: 'butter', label: 'Butterworth' },
        { value: 'cheby1', label: 'Chebyshev 1' },
        { value: 'cheby2', label: 'Chebyshev 2' },
        { value: 'ellip', label: 'elliptique (Cauer)' },
      ],
      default: 'butter',
    }),
    fp: float('f_p', {
      description: 'bord de bande passante',
      min: 200,
      max: 2000,
      step: 10,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    fstop: float('f_a', {
      description: "bord de bande d'arrêt",
      min: 400,
      max: 8000,
      step: 10,
      default: 2000,
      unit: 'Hz',
      precision: 0,
    }),
    Amax: float('A_max', {
      description: 'ondulation maximale en bande passante',
      min: 0.1,
      max: 3,
      step: 0.1,
      default: 1,
      unit: 'dB',
      precision: 1,
    }),
    Amin: float('A_min', {
      description: "atténuation minimale en bande d'arrêt",
      min: 20,
      max: 80,
      step: 1,
      default: 40,
      unit: 'dB',
      precision: 0,
    }),
  },

  validate: [
    { when: (p) => p.fstop <= 1.15 * p.fp, message: 'f_a doit dépasser 1.15·f_p (bande de transition)' },
    {
      when: (p) => requiredOrder(p) > 16,
      message: 'gabarit trop exigeant pour cette famille (n > 16) — desserrer le gabarit ou changer de famille',
    },
  ],

  derived: {
    selectivity: { label: 'sélectivité f_a/f_p', calc: (p) => (p.fstop / p.fp).toFixed(2) },
  },

  views: [
    view(
      'response',
      'Réponse et gabarit',
      line('response', {
        width: 2,
        overlays: [
          band('zone1', { color: '#EDB120', opacity: 0.18, label: 'gabarit' }),
          band('zone2', { color: '#EDB120', opacity: 0.18 }),
          vline('fp', { color: '#EDB120', dashed: true, label: 'f_p' }),
          vline('fstop', { color: '#EDB120', dashed: true, label: 'f_a' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz', scale: 'log' },
          y: { label: '|H(jf)|', unit: 'dB', domain: [-90, 5] },
        },
      })
    ),
    // CUSTOM view: equal-aspect s-plane — see views/PZPlane.svelte
    custom('poles', 'Pôles et zéros', () => import('./views/PZPlane.svelte')),
    view(
      'delay',
      'Retard de groupe',
      line('delay', {
        overlays: [vline('fp', { color: '#EDB120', dashed: true, label: 'f_p' })],
        axes: { x: { label: 'f', unit: 'Hz' }, y: { label: 'τg', unit: 'ms' } },
      })
    ),
  ],
};
