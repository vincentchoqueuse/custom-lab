import { float, log, select } from '../../../core/fields.js';
import { view, line, scatter, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'bode-measurement',
  title: "Réponse fréquentielle à l'oscillo",
  subtitle: 'Le Bode point par point : deux traces, un rapport, un déphasage',
  tags: ['analogique', 'Bode', 'oscilloscope', 'mesure', 'RC', 'résonance'],

  params: {
    system: select('système', {
      description: 'circuit sous test',
      options: [
        { value: 'rc', label: 'passe-bas RC (1er ordre)' },
        { value: 'order2', label: 'résonant (2ᵉ ordre)' },
      ],
      default: 'rc',
    }),
    f: log('f', {
      description: 'fréquence du générateur',
      min: 10,
      max: 10000,
      default: 100,
      unit: 'Hz',
      precision: 0,
    }),
    fc: log('f_c', {
      description: 'fréquence de coupure du RC',
      min: 50,
      max: 5000,
      default: 500,
      unit: 'Hz',
      precision: 0,
      visibleIf: { system: 'rc' },
    }),
    f0: log('f₀', {
      description: 'fréquence propre du résonant',
      min: 50,
      max: 5000,
      default: 500,
      unit: 'Hz',
      precision: 0,
      visibleIf: { system: 'order2' },
    }),
    Q: log('Q', {
      description: 'facteur de qualité',
      min: 0.5,
      max: 20,
      default: 2,
      precision: 2,
      visibleIf: { system: 'order2' },
    }),
    sigma: float('σ', {
      description: 'bruit de mesure (oscillo + câblage)',
      min: 0,
      max: 0.3,
      step: 0.01,
      default: 0.05,
      precision: 2,
    }),
  },

  groups: [
    { title: 'Circuit', params: ['system', 'fc', 'f0', 'Q'] },
    { title: 'Banc de mesure', params: ['f', 'sigma'] },
  ],

  views: [
    view(
      'scope',
      "L'oscillo",
      line('scopeOut', {
        color: '#D95319',
        width: 1.6,
        label: 'sortie',
        overlays: [line('scopeIn', { color: '#0072BD', label: 'entrée' })],
        axes: { x: { label: 't', unit: 'ms' }, y: 'tension (V)' },
      })
    ),
    view(
      'gain',
      'Bode — gain',
      line('gainTheory', {
        width: 2,
        label: 'théorie',
        overlays: [
          scatter('gainMeas', { color: '#D95319', size: 3.5, opacity: 0.9, label: 'mesures' }),
          vline('f', { color: '#EDB120', dashed: true, label: 'f' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz', scale: 'log' },
          y: { label: '|H|', unit: 'dB', domain: [-65, 30] },
        },
      })
    ),
    view(
      'phase',
      'Bode — phase',
      line('phaseTheory', {
        width: 2,
        label: 'théorie',
        overlays: [
          scatter('phaseMeas', { color: '#D95319', size: 3.5, opacity: 0.9, label: 'mesures' }),
          vline('f', { color: '#EDB120', dashed: true, label: 'f' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz', scale: 'log' },
          y: { label: 'arg H', unit: '°', domain: [-190, 10] },
        },
      })
    ),
  ],
};
