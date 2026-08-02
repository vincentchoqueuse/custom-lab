import { float, int } from '../../../core/fields.js';
import { view, custom, line } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'gaussian-2d',
  title: 'Gaussienne à deux dimensions',
  subtitle: 'Corrélation, ellipses iso-densité, axes principaux et régression',
  tags: ['gaussienne', '2D', 'corrélation', 'covariance', 'ellipse', 'régression'],

  params: {
    mux: float('μₓ', { description: 'moyenne de X', min: -3, max: 3, step: 0.1, default: 0 }),
    muy: float('μᵧ', { description: 'moyenne de Y', min: -3, max: 3, step: 0.1, default: 0 }),
    sigmax: float('σₓ', { description: 'écart-type de X', min: 0.3, max: 3, step: 0.1, default: 1.5 }),
    sigmay: float('σᵧ', { description: 'écart-type de Y', min: 0.3, max: 3, step: 0.1, default: 1 }),
    rho: float('ρ', {
      description: 'corrélation entre X et Y',
      min: -0.95, max: 0.95, step: 0.05, default: 0.6, precision: 2,
    }),
    N: int('N', { description: 'nombre de réalisations', min: 50, max: 5000, step: 50, default: 500 }),
    // no seed here: injected by the core
  },

  derived: {
    cov: { label: 'cov = ρσₓσᵧ', calc: (q) => (q.rho * q.sigmax * q.sigmay).toFixed(3) },
    slope: { label: 'pente E[Y|X] = ρσᵧ/σₓ', calc: (q) => ((q.rho * q.sigmay) / q.sigmax).toFixed(3) },
  },

  groups: [
    { title: 'Moyenne', params: ['mux', 'muy'] },
    { title: 'Covariance', params: ['sigmax', 'sigmay', 'rho'] },
    { title: 'Simulation', params: ['N'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // CUSTOM view — justification: a 2D plane with an enforced EQUAL-ASPECT
    // scale (ellipse angles must be honest), closed iso-density ellipses,
    // principal-axis segments and a clipped point cloud fit no generic
    // 1D-oriented plot type.
    custom('plane', 'Nuage & ellipses', () => import('./views/GaussianPlane.svelte')),

    // Declarative: the two marginal densities — deliberately insensitive to ρ.
    view(
      'marginals',
      'Marginales',
      line('pdfMarginalX', {
        width: 2.5,
        label: 'pdf de X',
        overlays: [line('pdfMarginalY', { color: '#D95319', width: 2.5, label: 'pdf de Y' })],
        axes: { x: 'x', y: 'densité' },
      })
    ),
  ],
};
