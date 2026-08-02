import { float, int } from '../../../core/fields.js';
import { view, custom, histogram, line, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'bias-variance-target',
  order: 1,
  title: 'La cible : biais, variance, EQM',
  subtitle: 'Quatre estimateurs du centre — centré n\'est pas groupé, et l\'EQM tranche',
  tags: ['estimateur', 'biais', 'variance', 'EQM', 'rétrécissement'],

  params: {
    mu: float('μ', { description: 'centre de la cible (deux coordonnées)', min: 0, max: 5, step: 0.1, default: 2 }),
    sigma: float('σ', { description: 'écart-type de chaque tir', min: 0.5, max: 3, step: 0.1, default: 1.5 }),
    N: int('N', { description: 'taille de chaque échantillon', min: 2, max: 100, default: 5 }),
    lambda: float('λ', {
      description: 'rétrécissement de λx̄ vers 0',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.8,
      precision: 2,
    }),
    M: int('M', {
      description: 'nombre d\'expériences (tirs)',
      min: 100,
      max: 5000,
      step: 100,
      default: 400,
    }),
    // no seed here: injected by the core
  },

  derived: {
    varMean: { label: 'Var(x̄) = 2σ²/N', calc: (p) => ((2 * p.sigma ** 2) / p.N).toFixed(3) },
    lambdaOpt: {
      label: 'λ* = μ²/(μ²+σ²/N)',
      calc: (p) => (p.mu ** 2 / (p.mu ** 2 + p.sigma ** 2 / p.N)).toFixed(3),
    },
  },

  groups: [
    { title: 'Cible', params: ['mu', 'sigma'] },
    { title: 'Estimateurs', params: ['N', 'lambda'] },
    { title: 'Répétitions', params: ['M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // CUSTOM view: the canonical 2×2 dartboard figure — four equal-aspect
    // targets with rings, shot clouds and per-estimator EQM annotations fit
    // no generic 1D plot type.
    custom('targets', 'La cible', () => import('./views/Targets.svelte')),

    view(
      'sampling',
      'Distributions (coordonnée x)',
      histogram('dMean', {
        color: '#0072BD',
        opacity: 0.55,
        label: 'x̄',
        overlays: [
          histogram('dMedian', { color: '#77AC30', opacity: 0.45, label: 'médiane' }),
          histogram('dShrink', { color: '#D95319', opacity: 0.5, label: 'λx̄' }),
          histogram('dFirst', { color: '#7E2F8E', opacity: 0.35, label: 'x₁' }),
          vline((p) => p.mu, { color: '#EDB120', dashed: true, width: 2, label: 'μ' }),
        ],
        axes: { x: 'valeur estimée', y: 'densité' },
      })
    ),

    // The exact EQM(λ) of the shrunk mean: same U as ridge, in closed form.
    view(
      'tradeoff',
      'EQM vs λ',
      line('mseVsLambda', {
        color: '#7E2F8E',
        width: 2.5,
        label: 'EQM',
        overlays: [
          line('bias2VsLambda', { color: '#D95319', width: 2, label: 'biais²' }),
          line('varVsLambda', { color: '#0072BD', width: 2, label: 'variance' }),
          vline('lambdaStar', { color: '#77AC30', dashed: true, width: 1.8, label: 'λ*' }),
          vline((p) => p.lambda, { color: '#EDB120', dashed: true, width: 2, label: 'λ' }),
        ],
        axes: { x: 'λ', y: 'erreur quadratique' },
      })
    ),
  ],
};
