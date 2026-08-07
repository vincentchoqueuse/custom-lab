import { float, int, select } from '../../../core/fields.js';
import { view, line, histogram, density, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'affine-transform',
  order: 2,
  random: true,
  title: 'Affine transform Y = aX + b',
  subtitle: 'How a and b shift, stretch and flip a density',
  tags: ['transform', 'random variable', 'mean', 'variance'],

  doc: `What Y = aX + b does to a density, one dial at a time. With a = 1, b slides
the curve as a whole: E[Y] follows, and the variance does not move — it
measures spread about the mean, and the mean shifted along with everything
else. With b = 0, raising a widens the curve and flattens it at once, since
the area under a density is always 1; taking a from 1 to 2 quadruples the
variance, because Var(Y) = a²·Var(X).

A negative a mirrors the density about the origin, and this is where the
absolute value in f_Y(y) = f_X((y−b)/a)/|a| stops being a typographic
convention: without it the density would come out negative.

The histogram view is the confirmation: the transformed draws land on the
transformed density, having never been told about it.`,

  params: {
    law: select('distribution', {
      description: 'distribution of the starting variable X',
      options: [
        { value: 'gaussian', label: 'Gaussian' },
        { value: 'uniform', label: 'Uniform U(0, 1)' },
        { value: 'exponential', label: 'Exponential' },
        { value: 'rayleigh', label: 'Rayleigh(1)' },
      ],
      default: 'gaussian',
    }),
    a: float('a', { description: 'scale factor', min: -3, max: 3, step: 0.1, default: 2 }),
    b: float('b', { description: 'shift', min: -5, max: 5, step: 0.1, default: 1 }),
    N: int('N', {
      description: 'draws for the histogram',
      min: 100,
      max: 20000,
      step: 100,
      default: 5000,
    }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (q) => q.a === 0, message: 'a = 0 collapses Y to a constant — pick a ≠ 0' },
  ],

  derived: {
    scale: { label: '|a| (width ×)', calc: (q) => Math.abs(q.a).toFixed(2) },
    varFactor: { label: 'a² (variance ×)', calc: (q) => (q.a * q.a).toFixed(2) },
  },

  groups: [
    { title: 'Starting variable', params: ['law'] },
    { title: 'Transform', params: ['a', 'b'] },
    { title: 'Simulation', params: ['N'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // Fully declarative: the two theoretical densities with their means.
    view(
      'pdfs',
      'Densities',
      line('pdfX', {
        width: 2.5,
        label: 'X',
        overlays: [
          line('pdfY', { color: '#D95319', width: 2.5, label: 'Y = aX + b' }),
          vline('meanX', { color: '#0072BD', dashed: true, width: 1.4, label: 'E[X]' }),
          vline('meanY', { color: '#D95319', dashed: true, width: 1.4, label: 'E[Y]' }),
        ],
        axes: { x: 'x', y: 'density' },
      })
    ),

    // The transformed samples land exactly on the transformed pdf.
    view(
      'empirical',
      'Histogram of Y',
      histogram('ySamples', {
        label: 'Y, sampled',
        overlays: [density('pdfY', { color: '#D95319', width: 2.5, label: 'pdf of Y' })],
        axes: { x: 'y', y: 'density' },
      })
    ),
  ],
};
