import { float, int, select } from '../../../core/fields.js';
import { view, bars, density } from '../../../core/views.js';
import { canonicalLaws } from '../../../core/laws.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'central-limit',
  order: 5,
  title: 'Théorème central limite',
  subtitle: 'La moyenne de n tirages devient gaussienne — quelle que soit la loi',
  tags: ['TCL', 'CLT', 'convergence', 'gaussienne', 'moyenne'],

  params: {
    law: select('loi', {
      description: 'loi des tirages individuels',
      options: [
        { value: 'dice', label: 'Dé à 6 faces' },
        { value: 'uniform', label: 'Uniforme U(0, 1)' },
        { value: 'exponential', label: 'Exponentielle Exp(1)' },
        { value: 'bernoulli', label: 'Bernoulli(p)' },
      ],
      default: 'dice',
    }),
    n: int('n', { description: 'tirages moyennés par réalisation', min: 1, max: 200, default: 1 }),
    M: int('M', {
      description: 'nombre de moyennes calculées',
      min: 100,
      max: 20000,
      step: 100,
      default: 5000,
    }),
    p: float('p', {
      description: 'probabilité de succès',
      min: 0.05,
      max: 0.95,
      step: 0.05,
      default: 0.1,
      precision: 2,
      visibleIf: { law: 'bernoulli' },
    }),
    // no seed here: injected by the core
  },

  derived: {
    sdOfMean: {
      label: 'σ/√n',
      calc: (q) => Math.sqrt(canonicalLaws[q.law].variance(q) / q.n).toFixed(3),
    },
  },

  groups: [
    { title: 'Tirages', params: ['law', 'p'] },
    { title: 'Moyennage', params: ['n', 'M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // Fully declarative: binned density of the M means (edges aligned on the
    // discrete value grid by compute) + the CLT Gaussian N(μ, σ²/n) with the
    // SAME mean and the CORRECT variance.
    view(
      'clt',
      'Moyenne x̄ₙ',
      bars('meansPdf', {
        label: 'moyennes empiriques',
        overlays: [
          density('gaussPdf', { color: '#D95319', width: 2.5, label: 'N(μ, σ²/n)' }),
        ],
        axes: { x: 'x̄ₙ', y: 'densité' },
      })
    ),
  ],
};
