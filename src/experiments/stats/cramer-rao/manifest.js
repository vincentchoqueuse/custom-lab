import { float, int } from '../../../core/fields.js';
import { view, histogram, line, density, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'cramer-rao',
  title: 'La borne de Cramér-Rao',
  subtitle: 'Un plancher sous toutes les variances — et qui le touche',
  tags: ['Cramér-Rao', 'information de Fisher', 'efficacité', 'estimateur'],
  group: 'Estimateurs et performances',

  params: {
    mu: float('μ', { description: 'moyenne vraie', min: 0, max: 5, step: 0.1, default: 2 }),
    sigma: float('σ', { description: 'écart-type vrai', min: 0.5, max: 3, step: 0.1, default: 1.5 }),
    N: int('N', { description: 'taille de chaque échantillon', min: 2, max: 200, default: 20 }),
    M: int('M', {
      description: 'nombre d\'expériences répétées',
      min: 100,
      max: 10000,
      step: 100,
      default: 3000,
    }),
    // no seed here: injected by the core
  },

  derived: {
    fisher: { label: 'information I(μ) = N/σ²', calc: (p) => (p.N / p.sigma ** 2).toFixed(3) },
    effMedTh: { label: 'efficacité asymptotique de la médiane : 2/π', calc: () => (2 / Math.PI).toFixed(3) },
  },

  groups: [
    { title: 'Population', params: ['mu', 'sigma'] },
    { title: 'Échantillonnage répété', params: ['N', 'M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // the floor: empirical variances against σ²/N in log-log
    view(
      'variance',
      'Variance vs N',
      line('varMean', {
        width: 2.2,
        label: 'x̄',
        overlays: [
          line('varMedian', { color: '#77AC30', width: 2.2, label: 'médiane' }),
          line('varMidrange', { color: '#7E2F8E', width: 2.2, label: 'mi-étendue' }),
          line('crbLine', { color: '#EDB120', width: 2, dashed: true, label: 'CRB = σ²/N' }),
        ],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'variance', scale: 'log' } },
      })
    ),

    // three widths at the same N, against the best-possible density
    view(
      'sampling',
      'Distributions des estimateurs',
      histogram('dMean', {
        color: '#0072BD',
        opacity: 0.55,
        label: 'x̄',
        overlays: [
          histogram('dMedian', { color: '#77AC30', opacity: 0.45, label: 'médiane' }),
          histogram('dMidrange', { color: '#7E2F8E', opacity: 0.35, label: 'mi-étendue' }),
          density('bestPdf', { color: '#EDB120', width: 2.2, label: 'N(μ, σ²/N) — le plancher' }),
          vline((p) => p.mu, { color: '#EDB120', dashed: true, width: 1.6 }),
        ],
        axes: { x: 'valeur estimée', y: 'densité' },
      })
    ),

    // efficiency CRB/Var: 1 for the mean, 2/π for the median, → 0 beyond
    view(
      'efficiency',
      'Efficacité vs N',
      line('effMean', {
        width: 2.2,
        label: 'x̄',
        overlays: [
          line('effMedian', { color: '#77AC30', width: 2.2, label: 'médiane' }),
          line('effMidrange', { color: '#7E2F8E', width: 2.2, label: 'mi-étendue' }),
          hline(() => 1, { color: '#EDB120', dashed: true, width: 1.6, label: 'efficace' }),
          hline(() => 2 / Math.PI, { color: '#77AC30', dashed: true, width: 1.3, label: '2/π' }),
        ],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'CRB / Var', domain: [0, 1.15] } },
      })
    ),
  ],
};
