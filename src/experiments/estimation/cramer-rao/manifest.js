import { float, int } from '../../../core/fields.js';
import { view, histogram, line, density, vline, hline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'cramer-rao',
  order: 5,
  random: true,
  title: 'La borne de Cramér-Rao',
  subtitle:
    'Estimer μ à partir de N tirages gaussiens : aucun estimateur ne descend sous σ²/N',
  tags: ['Cramér-Rao', 'information de Fisher', 'efficacité', 'estimateur'],

  params: {
    mu: float('μ', {
      description: 'LE paramètre à estimer — moyenne vraie de la population',
      min: 0,
      max: 5,
      step: 0.1,
      default: 2,
    }),
    sigma: float('σ', {
      description: 'écart-type vrai, supposé CONNU (seul μ est estimé)',
      min: 0.5,
      max: 3,
      step: 0.1,
      default: 1.5,
    }),
    N: int('N', {
      description: 'nombre de tirages X₁…X_N observés à chaque expérience',
      min: 2,
      max: 200,
      default: 20,
    }),
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
    modele: {
      label: 'modèle',
      calc: (p) => `X ~ N(μ = ${p.mu}, σ² = ${(p.sigma ** 2).toFixed(2)}) — on estime μ`,
    },
    fisher: { label: 'information I(μ) = N/σ²', calc: (p) => (p.N / p.sigma ** 2).toFixed(3) },
    effMedTh: { label: 'efficacité asymptotique de la médiane : 2/π', calc: () => (2 / Math.PI).toFixed(3) },
  },

  groups: [
    { title: 'Population', params: ['mu', 'sigma'] },
    { title: 'Échantillonnage répété', params: ['N', 'M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // the floor: empirical variances against σ²/N in log-log
    view(
      'variance',
      'Variance de μ̂ vs N',
      line('varMean', {
        width: 2.2,
        label: 'μ̂ = x̄ (moyenne)',
        overlays: [
          line('varMedian', { color: '#77AC30', width: 2.2, label: 'μ̂ = médiane' }),
          line('varMidrange', { color: '#7E2F8E', width: 2.2, label: 'μ̂ = mi-étendue' }),
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
        label: 'μ̂ = x̄ (moyenne)',
        overlays: [
          histogram('dMedian', { color: '#77AC30', opacity: 0.45, label: 'μ̂ = médiane' }),
          histogram('dMidrange', { color: '#7E2F8E', opacity: 0.35, label: 'μ̂ = mi-étendue' }),
          density('bestPdf', { color: '#EDB120', width: 2.2, label: 'N(μ, σ²/N) — la loi du meilleur μ̂' }),
          vline((p) => p.mu, { color: '#EDB120', dashed: true, width: 1.6 }),
        ],
        axes: { x: 'μ̂', y: 'densité' },
      })
    ),

    // efficiency CRB/Var: 1 for the mean, 2/π for the median, → 0 beyond
    view(
      'efficiency',
      'Efficacité de μ̂ vs N',
      line('effMean', {
        width: 2.2,
        label: 'μ̂ = x̄ (moyenne)',
        overlays: [
          line('effMedian', { color: '#77AC30', width: 2.2, label: 'μ̂ = médiane' }),
          line('effMidrange', { color: '#7E2F8E', width: 2.2, label: 'μ̂ = mi-étendue' }),
          hline(() => 1, { color: '#EDB120', dashed: true, width: 1.6, label: 'efficace (touche la borne)' }),
          hline(() => 2 / Math.PI, { color: '#77AC30', dashed: true, width: 1.3, label: '2/π' }),
        ],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'CRB / Var(μ̂)', domain: [0, 1.15] } },
      })
    ),
  ],
};
