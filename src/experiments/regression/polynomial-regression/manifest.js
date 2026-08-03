import { float, int, log } from '../../../core/fields.js';
import { view, line, scatter, stem, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'polynomial-regression',
  order: 2,
  title: 'Régression polynomiale',
  subtitle: 'Moindres carrés et ridge : ajustement, sur-ajustement, régularisation',
  tags: ['moindres carrés', 'régression', 'polynôme', 'overfitting', 'ridge', 'régularisation'],

  params: {
    a0: float('a₀', { description: 'coefficient constant', min: -2, max: 2, step: 0.1, default: 0.5 }),
    a1: float('a₁', { description: 'coefficient en x', min: -2, max: 2, step: 0.1, default: -1 }),
    a2: float('a₂', { description: 'coefficient en x²', min: -2, max: 2, step: 0.1, default: -0.5 }),
    a3: float('a₃', { description: 'coefficient en x³', min: -2, max: 2, step: 0.1, default: 2 }),
    d: int('d', { description: 'ordre du polynôme estimé', min: 0, max: 9, default: 3 }),
    lambda: log('λ', { description: 'régularisation ridge', min: 1e-3, max: 1e3, default: 1 }),
    N: int('N', { description: 'nombre de points', min: 5, max: 200, default: 30 }),
    sigma: float('σ', { description: 'écart-type du bruit', min: 0, max: 2, step: 0.05, default: 0.3 }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (p) => p.d + 1 > p.N, message: 'Il faut N ≥ d+1 points pour estimer d+1 coefficients' },
  ],

  derived: {
    dof: { label: 'N − (d+1)', calc: (p) => p.N - (p.d + 1) },
  },

  groups: [
    { title: 'Polynôme vrai (degré 3)', params: ['a0', 'a1', 'a2', 'a3'] },
    { title: 'Données', params: ['N', 'sigma'] },
    { title: 'Modèle estimé', params: ['d', 'lambda'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // Declarative only — true curve, noisy data, least-squares fit.
    view(
      'fit',
      'Ajustement',
      line('trueCurve', {
        width: 2.5,
        overlays: [
          scatter('noisyPoints', { color: '#7E2F8E', size: 3.5, opacity: 0.6 }),
          line('fittedCurve', { color: '#D95319', width: 2.5, dashed: true }),
        ],
        axes: { x: 'x', y: 'y' },
      })
    ),

    // Same scene with the ridge estimate on top: â = (XᵀX + λD)⁻¹Xᵀy.
    view(
      'ridge',
      'Ridge',
      line('trueCurve', {
        width: 2.5,
        label: 'vrai',
        overlays: [
          scatter('noisyPoints', { color: '#7E2F8E', size: 3.5, opacity: 0.6 }),
          line('fittedCurve', { color: '#D95319', width: 2, dashed: true, label: 'MC (λ=0)' }),
          line('ridgeCurve', { color: '#77AC30', width: 2.5, label: 'ridge (λ)' }),
        ],
        axes: { x: 'x', y: 'y' },
      })
    ),

    // Estimated coefficients (bars) against the true and ridge ones (dots).
    view(
      'coefficients',
      'Coefficients',
      stem('coeffsHat', {
        color: '#D95319',
        opacity: 0.75,
        label: 'MC',
        overlays: [
          hline(() => 0, { color: '#a1a1aa', width: 1 }),
          scatter('coeffsTrue', { color: '#0072BD', size: 5, label: 'vrais' }),
          scatter('coeffsRidge', { color: '#77AC30', size: 4.5, label: 'ridge' }),
        ],
        axes: { x: 'k (degré)', y: 'aₖ' },
      })
    ),

    // The ridge picture: EQM(λ) = biais²(λ) + variance(λ), Monte Carlo on the
    // design points — the U-shaped curve that justifies a biased estimator.
    view(
      'tradeoff',
      'Biais–variance vs λ',
      line('mseVsLambda', {
        color: '#7E2F8E',
        width: 2.5,
        label: 'EQM',
        overlays: [
          line('bias2VsLambda', { color: '#D95319', width: 2, label: 'biais²' }),
          line('varVsLambda', { color: '#0072BD', width: 2, label: 'variance' }),
          vline((p) => p.lambda, { color: '#EDB120', dashed: true, width: 2, label: 'λ' }),
        ],
        axes: { x: { label: 'λ', scale: 'log' }, y: 'erreur de prédiction' },
      })
    ),
  ],
};
