import { float, int, log } from '../../../core/fields.js';
import { view, line, scatter, stem, vline, hline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'polynomial-regression',
  order: 3,
  random: true,
  title: 'Polynomial regression',
  subtitle: 'Least squares and ridge: fitting, overfitting, regularization',
  tags: ['least squares', 'regression', 'polynomial', 'overfitting', 'ridge', 'regularization'],

  doc: `A cubic is generated and a polynomial of degree d is fitted, and the three
regimes of the chapter each get a scene. At d = 3 everything behaves: the
estimated curve stays near the truth and the coefficients bracket the true
values. At d = 1 what remains is bias — a straight line cannot follow a
cubic, and no amount of data repairs a model too poor to hold the truth. At
d = 9 with fifteen points the polynomial fits the noise: redrawing makes the
curve dance violently, which is variance made visible, and the estimated
coefficients explode while the true ones stay small.

Ridge is the cure with a dial. Minimizing ‖y−Xa‖² + λ‖a‖² penalizes large
coefficients: raising λ calms the fit and brings it back toward the truth,
and pushing further flattens it — variance traded for bias, and the trade can
be overpaid.

The trade-off view draws the curve of the chapter, MSE(λ) = bias²(λ) +
variance(λ): no bias and enormous variance at λ → 0, the reverse at λ → ∞,
and the minimum strictly between them — the best estimator is biased. More
noise moves the minimum right: more regularization, exactly when the data
deserve less trust.`,


  params: {
    a0: float('a₀', { description: 'constant coefficient', min: -2, max: 2, step: 0.1, default: 0.5 }),
    a1: float('a₁', { description: 'coefficient of x', min: -2, max: 2, step: 0.1, default: -1 }),
    a2: float('a₂', { description: 'coefficient of x²', min: -2, max: 2, step: 0.1, default: -0.5 }),
    a3: float('a₃', { description: 'coefficient of x³', min: -2, max: 2, step: 0.1, default: 2 }),
    d: int('d', { description: 'degree of the estimated polynomial', min: 0, max: 9, default: 3 }),
    lambda: log('λ', { description: 'ridge regularization', min: 1e-3, max: 1e3, default: 1 }),
    N: int('N', { description: 'number of points', min: 5, max: 200, default: 30 }),
    sigma: float('σ', { description: 'noise standard deviation', min: 0, max: 2, step: 0.05, default: 0.3 }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (p) => p.d + 1 > p.N, message: 'N ≥ d+1 points are needed to estimate d+1 coefficients' },
  ],

  derived: {
    dof: { label: 'N − (d+1)', calc: (p) => p.N - (p.d + 1) },
  },

  groups: [
    { title: 'True polynomial (degree 3)', params: ['a0', 'a1', 'a2', 'a3'] },
    { title: 'Data', params: ['N', 'sigma'] },
    { title: 'Estimated model', params: ['d', 'lambda'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // ONE fit figure, carrying BOTH estimates. They were two tabs, and two tabs
    // is the wrong shape for this lesson: ridge is not another subject, it is
    // the same fit with one dial turned, and the whole of what it does is
    // visible only when the unregularized curve is next to it in the same
    // frame. λ is a pill, so the green curve leaves the orange one and comes
    // back under the hand — which is the demonstration.
    figure(
      'fit',
      line('trueCurve', {
        width: 2.5,
        label: 'true',
        overlays: [
          scatter('noisyPoints', { color: '#7E2F8E', size: 3.5, opacity: 0.6, label: 'data' }),
          line('fittedCurve', { color: '#D95319', width: 2, dashed: true, label: 'LS' }),
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
        label: 'LS',
        overlays: [
          hline(() => 0, { color: '#a1a1aa', width: 1 }),
          scatter('coeffsTrue', { color: '#0072BD', size: 5, label: 'true' }),
          scatter('coeffsRidge', { color: '#77AC30', size: 4.5, label: 'ridge' }),
        ],
        axes: { x: 'k (degree)', y: 'aₖ' },
      })
    ),

    // The ridge picture: MSE(λ) = bias²(λ) + variance(λ), Monte Carlo on the
    // design points — the U-shaped curve that justifies a biased estimator.
    view(
      'tradeoff',
      'Bias–variance vs λ',
      line('mseVsLambda', {
        color: '#7E2F8E',
        width: 2.5,
        label: 'MSE',
        overlays: [
          line('bias2VsLambda', { color: '#D95319', width: 2, label: 'bias²' }),
          line('varVsLambda', { color: '#0072BD', width: 2, label: 'variance' }),
          vline((p) => p.lambda, { color: '#EDB120', dashed: true, width: 2, label: 'λ' }),
        ],
        axes: { x: { label: 'λ', scale: 'log' }, y: 'prediction error' },
      })
    ),
  ],
};
