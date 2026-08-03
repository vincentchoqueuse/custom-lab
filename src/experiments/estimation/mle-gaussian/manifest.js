import { float, int, select } from '../../../core/fields.js';
import { view, line, scatter, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'mle-gaussian',
  order: 4,
  title: 'Maximum de vraisemblance',
  subtitle: 'Estimer μ (et σ) à partir de N réalisations gaussiennes',
  tags: ['estimation', 'MLE', 'vraisemblance', 'gaussienne'],

  params: {
    mu: float('μ', { description: 'moyenne vraie', min: 0, max: 10, step: 0.1, default: 5 }),
    sigma: float('σ', { description: 'écart-type vrai', min: 0.5, max: 4, step: 0.1, default: 1.5 }),
    N: int('N', { description: 'nombre de réalisations', min: 1, max: 500, default: 20 }),
    model: select('θ', {
      description: 'paramètres estimés',
      options: [
        { value: 'mean', label: 'μ seul (σ connue)' },
        { value: 'both', label: 'μ et σ (MLE complet)' },
      ],
      default: 'both',
    }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (p) => p.model === 'both' && p.N < 2, message: 'N ≥ 2 requis pour estimer σ' },
  ],

  derived: {
    stdError: { label: 'σ/√N', calc: (p) => (p.sigma / Math.sqrt(p.N)).toFixed(3) },
  },

  groups: [
    { title: 'Modèle vrai', params: ['mu', 'sigma'] },
    { title: 'Estimation', params: ['N', 'model'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // Declarative only — the whole experiment needs zero UI code.
    view(
      'densities',
      'Densités & réalisations',
      line('truePdf', {
        width: 2.5,
        overlays: [
          line('estimatedPdf', { color: '#D95319', width: 2.5, dashed: true }),
          scatter('samplesRug', { color: '#7E2F8E', size: 3.5, opacity: 0.55 }),
        ],
        axes: { x: 'x', y: 'densité' },
      })
    ),

    view(
      'loglik',
      'Log-vraisemblance',
      line('logLik', {
        overlays: [
          vline('mu', { color: '#0072BD', label: 'μ' }),
          vline('muHat', { color: '#D95319', dashed: true, label: 'μ̂' }),
        ],
        axes: { x: 'μ', y: 'ℓ(μ)' },
      })
    ),
  ],
};
