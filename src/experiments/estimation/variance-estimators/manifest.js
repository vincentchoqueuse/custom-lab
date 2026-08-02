import { float, int } from '../../../core/fields.js';
import { view, histogram, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'variance-estimators',
  title: 'Biais et variance d\'un estimateur',
  subtitle: 'Deux estimateurs de σ² : diviser par N ou par N−1 ?',
  tags: ['estimateur', 'biais', 'variance', 'distribution d\'échantillonnage'],

  params: {
    mu: float('μ', { description: 'moyenne vraie', min: -5, max: 5, step: 0.1, default: 0 }),
    sigma: float('σ', { description: 'écart-type vrai', min: 0.5, max: 3, step: 0.1, default: 1.5 }),
    N: int('N', { description: 'taille de chaque échantillon', min: 2, max: 100, default: 5 }),
    M: int('M', {
      description: 'nombre d\'expériences répétées',
      min: 100,
      max: 20000,
      step: 100,
      default: 2000,
    }),
    // no seed here: injected by the core
  },

  derived: {
    biasTh: { label: 'biais de σ̂² = −σ²/N', calc: (q) => (-(q.sigma ** 2) / q.N).toFixed(4) },
    factor: { label: '(N−1)/N', calc: (q) => ((q.N - 1) / q.N).toFixed(3) },
  },

  groups: [
    { title: 'Population', params: ['mu', 'sigma'] },
    { title: 'Échantillonnage répété', params: ['N', 'M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // An estimator IS a random variable: its sampling distribution, M times.
    view(
      'sampling',
      'Distribution des estimateurs',
      histogram('v1', {
        color: '#D95319',
        opacity: 0.55,
        label: 'σ̂² (÷N)',
        overlays: [
          histogram('v2', { color: '#0072BD', opacity: 0.5, label: 's² (÷N−1)' }),
          vline((q) => q.sigma * q.sigma, { color: '#EDB120', dashed: true, width: 2, label: 'σ²' }),
          vline('meanV1', { color: '#D95319', dashed: true, width: 1.6 }),
          vline('meanV2', { color: '#0072BD', dashed: true, width: 1.6 }),
        ],
        axes: { x: 'valeur de l\'estimateur', y: 'densité' },
      })
    ),

    view(
      'bias',
      'Biais vs N',
      line('biasEmp1', {
        color: '#D95319',
        width: 2.2,
        label: 'biais de σ̂² (÷N)',
        overlays: [
          line('biasEmp2', { color: '#0072BD', width: 2.2, label: 'biais de s² (÷N−1)' }),
          line('biasTh1', { color: '#D95319', width: 1.6, dashed: true, label: '−σ²/N' }),
          hline(() => 0, { color: '#a1a1aa', width: 1 }),
        ],
        axes: { x: { label: 'N', scale: 'log' }, y: 'biais empirique' },
      })
    ),
  ],
};
