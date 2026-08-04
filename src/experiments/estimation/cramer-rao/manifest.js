import { float, int } from '../../../core/fields.js';
import { view, histogram, line, density, vline, hline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'cramer-rao',
  order: 5,
  random: true,
  title: 'The Cramér–Rao bound',
  subtitle:
    'Estimating μ from N Gaussian draws: no estimator gets below σ²/N',
  tags: ['Cramér–Rao', 'Fisher information', 'efficiency', 'estimator'],

  params: {
    mu: float('μ', {
      description: 'THE parameter to estimate — true population mean',
      min: 0,
      max: 5,
      step: 0.1,
      default: 2,
    }),
    sigma: float('σ', {
      description: 'true standard deviation, assumed KNOWN (only μ is estimated)',
      min: 0.5,
      max: 3,
      step: 0.1,
      default: 1.5,
    }),
    N: int('N', {
      description: 'draws X₁…X_N observed in each experiment',
      min: 2,
      max: 200,
      default: 20,
    }),
    M: int('M', {
      description: 'number of repeated experiments',
      min: 100,
      max: 10000,
      step: 100,
      default: 3000,
    }),
    // no seed here: injected by the core
  },

  derived: {
    model: {
      label: 'model',
      calc: (p) => `X ~ N(μ = ${p.mu}, σ² = ${(p.sigma ** 2).toFixed(2)}) — μ is estimated`,
    },
    fisher: { label: 'information I(μ) = N/σ²', calc: (p) => (p.N / p.sigma ** 2).toFixed(3) },
    effMedTh: { label: 'asymptotic efficiency of the median: 2/π', calc: () => (2 / Math.PI).toFixed(3) },
  },

  groups: [
    { title: 'Population', params: ['mu', 'sigma'] },
    { title: 'Repeated sampling', params: ['N', 'M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // the floor: empirical variances against σ²/N in log-log
    view(
      'variance',
      'Variance of μ̂ vs N',
      line('varMean', {
        width: 2.2,
        label: 'μ̂ = x̄ (mean)',
        overlays: [
          line('varMedian', { color: '#77AC30', width: 2.2, label: 'μ̂ = median' }),
          line('varMidrange', { color: '#7E2F8E', width: 2.2, label: 'μ̂ = midrange' }),
          line('crbLine', { color: '#EDB120', width: 2, dashed: true, label: 'CRB = σ²/N' }),
        ],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'Var(μ̂)', scale: 'log' } },
      })
    ),

    // three widths at the same N, against the best-possible density
    figure(
      'sampling',
      histogram('dMean', {
        color: '#0072BD',
        opacity: 0.55,
        label: 'μ̂ = x̄ (mean)',
        overlays: [
          histogram('dMedian', { color: '#77AC30', opacity: 0.45, label: 'μ̂ = median' }),
          histogram('dMidrange', { color: '#7E2F8E', opacity: 0.35, label: 'μ̂ = midrange' }),
          density('bestPdf', { color: '#EDB120', width: 2.2, label: 'N(μ, σ²/N) — the distribution of the best μ̂' }),
          vline((p) => p.mu, { color: '#EDB120', dashed: true, width: 1.6 }),
        ],
        axes: { x: 'μ̂', y: 'density' },
      })
    ),

    // efficiency CRB/Var: 1 for the mean, 2/π for the median, → 0 beyond
    view(
      'efficiency',
      'Efficiency of μ̂ vs N',
      line('effMean', {
        width: 2.2,
        label: 'μ̂ = x̄ (mean)',
        overlays: [
          line('effMedian', { color: '#77AC30', width: 2.2, label: 'μ̂ = median' }),
          line('effMidrange', { color: '#7E2F8E', width: 2.2, label: 'μ̂ = midrange' }),
          hline(() => 1, { color: '#EDB120', dashed: true, width: 1.6, label: 'efficient (reaches the bound)' }),
          hline(() => 2 / Math.PI, { color: '#77AC30', dashed: true, width: 1.3, label: '2/π' }),
        ],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'CRB / Var(μ̂)', domain: [0, 1.15] } },
      })
    ),
  ],
};
