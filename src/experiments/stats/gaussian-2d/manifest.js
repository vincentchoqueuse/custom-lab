import { float, int } from '../../../core/fields.js';
import { view, custom, line } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'gaussian-2d',
  order: 3,
  random: true,
  title: 'The 2D Gaussian',
  subtitle: 'Correlation, iso-density ellipses, principal axes and regression',
  tags: ['Gaussian', '2D', 'correlation', 'covariance', 'ellipse', 'regression'],

  params: {
    mux: float('μₓ', { description: 'mean of X', min: -3, max: 3, step: 0.1, default: 0 }),
    muy: float('μᵧ', { description: 'mean of Y', min: -3, max: 3, step: 0.1, default: 0 }),
    sigmax: float('σₓ', { description: 'standard deviation of X', min: 0.3, max: 3, step: 0.1, default: 1.5 }),
    sigmay: float('σᵧ', { description: 'standard deviation of Y', min: 0.3, max: 3, step: 0.1, default: 1 }),
    rho: float('ρ', {
      description: 'correlation between X and Y',
      min: -0.95, max: 0.95, step: 0.05, default: 0.6, precision: 2,
    }),
    N: int('N', { description: 'number of draws', min: 50, max: 5000, step: 50, default: 500 }),
    // no seed here: injected by the core
  },

  derived: {
    cov: { label: 'cov = ρσₓσᵧ', calc: (q) => (q.rho * q.sigmax * q.sigmay).toFixed(3) },
    slope: { label: 'slope E[Y|X] = ρσᵧ/σₓ', calc: (q) => ((q.rho * q.sigmay) / q.sigmax).toFixed(3) },
  },

  groups: [
    { title: 'Mean', params: ['mux', 'muy'] },
    { title: 'Covariance', params: ['sigmax', 'sigmay', 'rho'] },
    { title: 'Simulation', params: ['N'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // CUSTOM view — justification: a 2D plane with an enforced EQUAL-ASPECT
    // scale (ellipse angles must be honest), closed iso-density ellipses,
    // principal-axis segments and a clipped point cloud fit no generic
    // 1D-oriented plot type.
    custom('plane', 'Cloud & ellipses', () => import('./views/GaussianPlane.svelte')),

    // Declarative: the two marginal densities — deliberately insensitive to ρ.
    view(
      'marginals',
      'Marginals',
      line('pdfMarginalX', {
        width: 2.5,
        label: 'pdf of X',
        overlays: [line('pdfMarginalY', { color: '#D95319', width: 2.5, label: 'pdf of Y' })],
        axes: { x: 'x', y: 'density' },
      })
    ),
  ],
};
