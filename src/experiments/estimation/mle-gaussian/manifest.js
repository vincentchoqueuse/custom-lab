import { float, int, select } from '../../../core/fields.js';
import { view, line, scatter, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'mle-gaussian',
  order: 4,
  random: true,
  title: 'Maximum likelihood',
  subtitle: 'Estimating μ (and σ) from N Gaussian draws',
  tags: ['estimation', 'MLE', 'likelihood', 'Gaussian'],

  doc: `N draws from a Gaussian, and the density that generated them to be
recovered. Each redraw moves the purple sample and the orange estimated
density while the blue true one stays put: the gap between the two curves is
the estimation error made visible, and the estimates μ̂ and σ̂ sit in the
statline. At N = 5 the estimated density dances from draw to draw, and that
dance IS the variance of the estimator — one number per experiment, seen as
a curve. The maximum likelihood σ̂ divides by N and sits below σ on average;
the neighbouring experiment on variance estimators takes that bias apart.

The likelihood view shows the machinery. The curve ℓ(μ) peaks at μ̂, not at
μ: the estimator maximizes the likelihood of the data that were observed,
not of the truth, and the distance between the two lines is what that costs
on the sample at hand. Increasing N tightens the curve around its peak — and
that curvature is the Fisher information, which is why a sharper peak and a
smaller estimator variance are the same statement, made precise by the
Cramér–Rao experiment next door.`,


  params: {
    mu: float('μ', { description: 'true mean', min: 0, max: 10, step: 0.1, default: 5 }),
    sigma: float('σ', { description: 'true standard deviation', min: 0.5, max: 4, step: 0.1, default: 1.5 }),
    N: int('N', { description: 'number of draws', min: 1, max: 500, default: 20 }),
    model: select('θ', {
      description: 'parameters estimated',
      options: [
        { value: 'mean', label: 'μ only (σ known)' },
        { value: 'both', label: 'μ and σ (full MLE)' },
      ],
      default: 'both',
    }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (p) => p.model === 'both' && p.N < 2, message: 'N ≥ 2 is required to estimate σ' },
  ],

  derived: {
    stdError: { label: 'σ/√N', calc: (p) => (p.sigma / Math.sqrt(p.N)).toFixed(3) },
  },

  groups: [
    { title: 'True model', params: ['mu', 'sigma'] },
    { title: 'Estimation', params: ['N', 'model'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // Declarative only — the whole experiment needs zero UI code.
    view(
      'densities',
      'Densities & draws',
      line('truePdf', {
        width: 2.5,
        overlays: [
          line('estimatedPdf', { color: '#D95319', width: 2.5, dashed: true }),
          scatter('samplesRug', { color: '#7E2F8E', size: 3.5, opacity: 0.55 }),
        ],
        axes: { x: 'x', y: 'density' },
      })
    ),

    view(
      'loglik',
      'Log-likelihood',
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
