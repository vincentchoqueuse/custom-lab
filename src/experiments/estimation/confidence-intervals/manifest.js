import { float, int, select, readonly } from '../../../core/fields.js';
import { view, custom, histogram, line, density, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'confidence-intervals',
  order: 6,
  random: true,
  title: 'Intervalles de confiance',
  subtitle: 'Couverture fréquentiste et largeur des IC',
  tags: ['fréquentiste', 'IC', 'Student'],

  params: {
    mu: float('μ', { description: 'moyenne vraie', min: 0, max: 10, step: 0.1, default: 5 }),
    sigma: float('σ', { description: 'écart-type', min: 0.5, max: 5, step: 0.1, default: 2 }),
    N: int('N', { description: "taille d'échantillon", min: 2, max: 200, default: 30 }),
    M: int('M', { description: "nombre d'IC", min: 10, max: 100, default: 40 }),
    conf: float('1−α', {
      description: 'niveau de confiance visé',
      min: 0.8,
      max: 0.99,
      step: 0.01,
      default: 0.95,
      precision: 2,
    }),
    known: select('σ connue ?', {
      options: [
        { value: false, label: 'non — IC de Student' },
        { value: true, label: 'oui — IC gaussien' },
      ],
      default: false,
    }),
    dof: readonly('ν', {
      description: 'degrés de liberté',
      visibleIf: { known: false },
      calc: (p) => p.N - 1,
    }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (p) => p.N < 2, message: 'N doit être ≥ 2' },
    { when: (p) => p.M * p.N > 1e7, message: 'M×N trop grand pour rester fluide' },
  ],

  derived: {
    meanVariance: { label: 'σ²/N', calc: (p) => (p.sigma ** 2 / p.N).toFixed(3) },
  },

  groups: [
    { title: 'Modèle', params: ['mu', 'sigma', 'known', 'dof'] },
    { title: 'Échantillonnage', params: ['N', 'M', 'conf'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // CUSTOM view — justification: the M stacked horizontal CI segments with
    // per-interval hit/miss coloring fit no generic plot type.
    custom('realizations', 'Réalisations', () => import('./views/Realizations.svelte')),

    view(
      'distribution',
      'Distribution de x̄',
      histogram('means', {
        overlays: [
          density('theoreticalDensity', { color: '#D95319' }),
          vline('mu', { color: '#EDB120', dashed: true, label: 'μ' }),
        ],
        axes: { x: 'x̄', y: 'fréquence' },
      })
    ),

    view(
      'coverage',
      'Couverture vs N',
      line('coverageVsN', {
        overlays: [hline((p) => p.conf, { dashed: true, label: '1−α' })],
        axes: { x: 'N', y: 'couverture empirique' },
      })
    ),
  ],
};
