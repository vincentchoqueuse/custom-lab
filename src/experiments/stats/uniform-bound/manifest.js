import { float, int } from '../../../core/fields.js';
import { view, histogram, line, scatter, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'uniform-bound',
  title: 'Estimer la borne d\'une loi uniforme',
  subtitle: 'X ~ U[0, θ] : max, max+min ou 2x̄ — trois estimateurs de θ',
  tags: ['estimateur', 'biais', 'EQM', 'uniforme', 'statistique d\'ordre'],

  params: {
    theta: float('θ', { description: 'borne droite vraie', min: 0.5, max: 10, step: 0.1, default: 5 }),
    N: int('N', { description: 'taille d\'échantillon', min: 2, max: 200, default: 10 }),
    M: int('M', {
      description: 'nombre d\'expériences répétées',
      min: 100,
      max: 20000,
      step: 100,
      default: 3000,
    }),
    // no seed here: injected by the core
  },

  derived: {
    biasMax: { label: 'biais du max = −θ/(N+1)', calc: (p) => (-p.theta / (p.N + 1)).toFixed(3) },
    ratio: {
      label: 'EQM(2x̄)/EQM(max) = (N+1)(N+2)/6N',
      calc: (p) => (((p.N + 1) * (p.N + 2)) / (6 * p.N)).toFixed(2),
    },
  },

  groups: [
    { title: 'Modèle', params: ['theta'] },
    { title: 'Échantillonnage répété', params: ['N', 'M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // One concrete sample: the data rug and where the three candidates land.
    view(
      'realization',
      'Une réalisation',
      scatter('samplePoints', {
        color: '#0072BD',
        size: 4,
        opacity: 0.7,
        overlays: [
          vline('est1', { color: '#D95319', width: 2, label: 'max' }),
          vline('est2', { color: '#77AC30', width: 2, label: 'max+min' }),
          vline('est3', { color: '#7E2F8E', width: 2, label: '2x̄' }),
          vline((p) => p.theta, { color: '#EDB120', dashed: true, width: 2, label: 'θ' }),
        ],
        axes: { x: 'x', y: '' },
      })
    ),

    // An estimator IS a random variable: the three sampling distributions.
    view(
      'sampling',
      'Distributions des estimateurs',
      histogram('t1', {
        color: '#D95319',
        opacity: 0.55,
        label: 'max',
        overlays: [
          histogram('t2', { color: '#77AC30', opacity: 0.5, label: 'max+min' }),
          histogram('t3', { color: '#7E2F8E', opacity: 0.45, label: '2x̄' }),
          vline((p) => p.theta, { color: '#EDB120', dashed: true, width: 2, label: 'θ' }),
        ],
        axes: { x: 'valeur de l\'estimateur', y: 'densité' },
      })
    ),

    // The punchline in log-log: 1/N (order statistics) vs 1/√N (CLT).
    view(
      'rmse',
      'RMSE vs N',
      line('rmseN1', {
        color: '#D95319',
        width: 2.2,
        label: 'max',
        overlays: [
          line('rmseN2', { color: '#77AC30', width: 2.2, label: 'max+min' }),
          line('rmseN3', { color: '#7E2F8E', width: 2.2, label: '2x̄' }),
          line('rmseTh1', { color: '#D95319', width: 1.4, dashed: true, label: 'θ√(2/(N+1)(N+2))' }),
          line('rmseTh3', { color: '#7E2F8E', width: 1.4, dashed: true, label: 'θ/√(3N)' }),
        ],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'RMSE', scale: 'log' } },
      })
    ),
  ],
};
