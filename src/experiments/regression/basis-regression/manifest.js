import { float, int, log, select } from '../../../core/fields.js';
import { view, line, scatter, vline, hline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'basis-regression',
  order: 3,
  random: true,
  title: 'Basis-function regression',
  subtitle: 'Linear does not mean straight — same least squares, new shapes',
  tags: ['basis functions', 'least squares', 'RBF', 'kernel', 'train/test', 'overfitting'],

  params: {
    basis: select('basis', {
      description: 'family of functions φⱼ',
      options: [
        { value: 'rbf', label: 'Gaussians (RBF)' },
        { value: 'poly', label: 'polynomials' },
        { value: 'fourier', label: 'Fourier' },
        { value: 'sigmoid', label: 'sigmoids (proto-neurons)' },
      ],
      default: 'rbf',
    }),
    target: select('target', {
      description: 'true function to recover',
      options: [
        { value: 'damped', label: 'damped sinusoid' },
        { value: 'square', label: 'square wave' },
        { value: 'bump', label: 'Gaussian bump' },
      ],
      default: 'damped',
    }),
    M: int('M', { description: 'number of basis functions', min: 1, max: 30, default: 8 }),
    ell: log('ℓ', {
      description: 'width of the Gaussians / steepness of the sigmoids',
      min: 0.02,
      max: 1,
      default: 0.15,
      visibleIf: { basis: ['rbf', 'sigmoid'] },
    }),
    lambda: log('λ', {
      description: 'ridge regularization (stabilizes tightly packed RBFs)',
      min: 1e-10,
      max: 1,
      default: 1e-8,
    }),
    N: int('N', { description: 'training points', min: 10, max: 300, default: 60 }),
    sigma: float('σ', { description: 'noise standard deviation', min: 0, max: 0.5, step: 0.02, default: 0.1 }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (p) => p.M > p.N, message: 'N ≥ M points are needed for M basis functions' },
  ],

  groups: [
    { title: 'Model', params: ['basis', 'M', 'ell', 'lambda'] },
    { title: 'Data', params: ['target', 'N', 'sigma'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    figure(
      'fit',
      line('trueCurve', {
        width: 2.2,
        label: 'true function',
        overlays: [
          scatter('trainPoints', { color: '#7E2F8E', size: 3.5, opacity: 0.55, label: 'data' }),
          line('fitCurve', { color: '#D95319', width: 2.5, label: 'fit' }),
        ],
        axes: { x: 'x', y: 'y' },
      })
    ),

    // the signature view: the fit IS a sum of weighted basis functions
    view(
      'basis',
      'Basis functions',
      line('basisCurves', {
        color: '#77AC30',
        width: 1.1,
        opacity: 0.55,
        label: 'wⱼ·φⱼ(x)',
        overlays: [
          line('fitCurve', { color: '#D95319', width: 2.5, label: 'sum (the fit)' }),
          line('trueCurve', { width: 1.6, dashed: true, label: 'true function' }),
        ],
        axes: { x: 'x', y: 'y' },
      })
    ),

    // train falls forever, test is U-shaped with a σ² floor
    view(
      'complexity',
      'Error vs M',
      line('errTrain', {
        width: 2.2,
        label: 'training',
        overlays: [
          line('errTest', { color: '#D95319', width: 2.4, label: 'test (fresh data)' }),
          hline((p) => Math.max(p.sigma ** 2, 1e-12), {
            color: '#a1a1aa',
            width: 1.2,
            dashed: true,
            label: 'σ² (floor)',
          }),
          vline((p) => p.M, { color: '#EDB120', dashed: true, width: 1.8, label: 'M' }),
        ],
        axes: { x: 'M (number of functions)', y: { label: 'MSE', scale: 'log' } },
      })
    ),
  ],
};
