import { float, int, select } from '../../../core/fields.js';
import { view, custom, line } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'distributions',
  title: 'Catalogue de lois',
  subtitle: 'pdf/pmf et CDF : théorie contre réalisations',
  tags: ['probabilités', 'lois', 'histogramme', 'CDF', 'Poisson', 'gaussienne'],
  group: 'Lois et théorèmes',

  params: {
    law: select('loi', {
      description: 'loi de probabilité',
      options: [
        { value: 'uniform', label: 'Uniforme U(a, b)' },
        { value: 'gaussian', label: 'Gaussienne N(μ, σ²)' },
        { value: 'exponential', label: 'Exponentielle Exp(λ)' },
        { value: 'rayleigh', label: 'Rayleigh(σ)' },
        { value: 'bernoulli', label: 'Bernoulli(p)' },
        { value: 'binomial', label: 'Binomiale B(n, p)' },
        { value: 'poisson', label: 'Poisson(λ)' },
      ],
      default: 'gaussian',
    }),
    N: int('N', { description: 'nombre de réalisations', min: 10, max: 10000, step: 10, default: 500 }),
    a: float('a', { description: 'borne inférieure', min: -5, max: 5, step: 0.1, default: 0, visibleIf: { law: 'uniform' } }),
    b: float('b', { description: 'borne supérieure', min: -5, max: 5, step: 0.1, default: 1, visibleIf: { law: 'uniform' } }),
    mu: float('μ', { description: 'moyenne', min: -5, max: 5, step: 0.1, default: 0, visibleIf: { law: 'gaussian' } }),
    sigma: float('σ', { description: 'paramètre d\'échelle', min: 0.2, max: 3, step: 0.1, default: 1, visibleIf: { law: ['gaussian', 'rayleigh'] } }),
    lambda: float('λ', { description: 'intensité', min: 0.2, max: 5, step: 0.1, default: 1.5, visibleIf: { law: ['exponential', 'poisson'] } }),
    p: float('p', { description: 'probabilité de succès', min: 0.05, max: 0.95, step: 0.05, default: 0.3, precision: 2, visibleIf: { law: ['bernoulli', 'binomial'] } }),
    n: int('n', { description: 'nombre d\'essais', min: 1, max: 30, default: 10, visibleIf: { law: 'binomial' } }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (q) => q.law === 'uniform' && q.a >= q.b, message: 'Il faut a < b' },
  ],

  groups: [
    { title: 'Loi', params: ['law', 'N'] },
    { title: 'Paramètres de la loi', params: ['a', 'b', 'mu', 'sigma', 'lambda', 'p', 'n'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // CUSTOM view — justification: the pdf panel switches representation with
    // the selected law (continuous: histogram bars + smooth theoretical curve;
    // discrete: paired empirical/theoretical bars on the integer support).
    // No single generic plot type covers both renderings.
    custom('pdf', 'pdf / pmf', () => import('./views/DistributionPdf.svelte')),

    view(
      'cdf',
      'Fonction de répartition',
      line('theoreticalCdf', {
        color: '#D95319',
        width: 2.5,
        label: 'théorique',
        overlays: [
          line('empiricalCdf', { color: '#0072BD', width: 2, label: 'empirique' }),
        ],
        axes: { x: 'x', y: { label: 'F(x)', domain: [0, 1.05] } },
      })
    ),
  ],
};
