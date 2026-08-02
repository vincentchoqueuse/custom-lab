import { float, int, select } from '../../../core/fields.js';
import { view, line, histogram, density, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'affine-transform',
  order: 2,
  title: 'Transformation affine Y = aX + b',
  subtitle: 'Comment a et b déplacent, dilatent et retournent une densité',
  tags: ['transformation', 'variable aléatoire', 'moyenne', 'variance'],

  params: {
    law: select('loi', {
      description: 'loi de la variable de départ X',
      options: [
        { value: 'gaussian', label: 'Gaussienne N(0, 1)' },
        { value: 'uniform', label: 'Uniforme U(0, 1)' },
        { value: 'exponential', label: 'Exponentielle Exp(1)' },
        { value: 'rayleigh', label: 'Rayleigh(1)' },
      ],
      default: 'gaussian',
    }),
    a: float('a', { description: 'facteur d\'échelle', min: -3, max: 3, step: 0.1, default: 2 }),
    b: float('b', { description: 'décalage', min: -5, max: 5, step: 0.1, default: 1 }),
    N: int('N', {
      description: 'réalisations pour l\'histogramme',
      min: 100,
      max: 20000,
      step: 100,
      default: 5000,
    }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (q) => q.a === 0, message: 'a = 0 écrase Y en une constante — choisir a ≠ 0' },
  ],

  derived: {
    scale: { label: '|a| (largeur ×)', calc: (q) => Math.abs(q.a).toFixed(2) },
    varFactor: { label: 'a² (variance ×)', calc: (q) => (q.a * q.a).toFixed(2) },
  },

  groups: [
    { title: 'Variable de départ', params: ['law'] },
    { title: 'Transformation', params: ['a', 'b'] },
    { title: 'Simulation', params: ['N'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // Fully declarative: the two theoretical densities with their means.
    view(
      'pdfs',
      'Densités',
      line('pdfX', {
        width: 2.5,
        label: 'X',
        overlays: [
          line('pdfY', { color: '#D95319', width: 2.5, label: 'Y = aX + b' }),
          vline('meanX', { color: '#0072BD', dashed: true, width: 1.4, label: 'E[X]' }),
          vline('meanY', { color: '#D95319', dashed: true, width: 1.4, label: 'E[Y]' }),
        ],
        axes: { x: 'x', y: 'densité' },
      })
    ),

    // The transformed samples land exactly on the transformed pdf.
    view(
      'empirical',
      'Histogramme de Y',
      histogram('ySamples', {
        label: 'Y empirique',
        overlays: [density('pdfY', { color: '#D95319', width: 2.5, label: 'pdf de Y' })],
        axes: { x: 'y', y: 'densité' },
      })
    ),
  ],
};
