// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'right-model',
    title: 'The right model (d = 3)',
    view: 'fit',
    params: { d: 3, N: 30, sigma: 0.3, lambda: 0.001 },
    visible: ['d', 'sigma', 'N'],
    notes: `The true polynomial has degree 3 and a degree 3 is estimated, so
everything behaves. Pressing R changes the noise and leaves the orange curve
close to the blue one.

Raising σ shows the degradation, and the coefficients view says the same thing
in numbers: the orange estimated bars bracket the blue true values.`,
  },
  {
    id: 'underfitting',
    title: 'Underfitting (d = 1)',
    view: 'fit',
    params: { d: 1, N: 30, sigma: 0.3, lambda: 0.001 },
    visible: ['d', 'N', 'lambda'],
    notes: `A straight line cannot follow a cubic, and what is left over is bias
rather than noise.

Asking whether more data would help is the useful question, and the answer is
no: the model is too poor, and the residuals stay structured at every N. Raising
d live from 1 to 2 to 3 shows the structure disappearing only when the model
becomes rich enough to hold the truth.`,
  },
  {
    id: 'overfitting',
    title: 'Overfitting (d = 9)',
    view: 'fit',
    params: { d: 9, N: 15, sigma: 0.4, lambda: 0.001 },
    visible: ['d', 'N', 'lambda'],
    notes: `Ten coefficients for fifteen points: the polynomial fits the noise.
Pressing R makes the orange curve dance violently, which is variance made
visible, and the coefficients view shows the estimated aₖ exploding while the
true ones stay small.

Raising N to 200 calms the overfitting without curing it — degree 3 is still
the better model, because the extra terms have nothing to describe.`,
  },
  {
    id: 'ridge',
    title: 'Ridge: taming degree 9',
    params: { d: 9, N: 15, sigma: 0.4, lambda: 0.001 },
    view: 'ridge',
    visible: ['lambda', 'N'],
    notes: `The same catastrophic setting, with one new dial. At λ = 0.001 the
green ridge curve coincides with the orange least-squares one.

Freezing and then raising λ calms the green curve and brings it back toward the
blue truth: large coefficients are being penalized, since what is minimized is
‖y−Xa‖² + λ‖a‖². At λ ≈ 10, pressing R makes the green curve dance far less
than the orange one. Push λ further and the curve flattens — variance has been
traded for bias, and the trade can be overpaid.`,
  },
  {
    id: 'tradeoff',
    title: 'The bias–variance trade-off',
    params: { d: 9, N: 15, sigma: 0.4, lambda: 1 },
    view: 'tradeoff',
    visible: ['lambda', 'd', 'N'],
    notes: `The curve of the chapter: MSE(λ) = bias²(λ) + variance(λ). On the
left, at λ → 0, there is no bias and enormous variance — plain least squares.
On the right there is no variance and enormous bias — the constant estimator.

The minimum of the MSE lies strictly between them, which is to say the best
estimator is biased. Moving λ along the yellow line and finding that point by
eye is the exercise. Asking what happens if σ doubles gives the right instinct:
the variance quadruples, the minimum shifts right, and more noise calls for
more regularization.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
