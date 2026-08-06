// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'vocabulary',
    title: 'Four marksmen, one vocabulary',
    view: 'targets',
    params: { mu: 2, sigma: 1.5, N: 5, lambda: 0.8, M: 400 },
    visible: ['N', 'sigma'],
    notes: `Four estimators of the same center, from the same data. The room can
name what it sees before any of it is explained: x̄ is on target and tight, the
median is on target and a little looser, λx̄ is off target but very tight, and
x₁ is on target and catastrophically scattered.

That gives the vocabulary its meaning: on target means unbiased, tight means low
variance, and the two are independent properties. Asking which estimator is
preferred, before reading the MSE printed under each target, usually produces
the wrong answer — which is the point of asking.`,
  },
  {
    id: 'useful-bias',
    title: 'The bias that wins',
    view: 'targets',
    params: { mu: 2, sigma: 1.5, N: 5, lambda: 0.8, M: 1000 },
    visible: ['lambda', 'N'],
    notes: `At N = 5 the MSE under the targets settles the question: the
off-target marksman wins. Freezing the figure and taking λ back to 1 turns λx̄
into x̄ again and sends the MSE back up, which makes the trade visible in one
gesture — bias bought in exchange for tightness.

Raising N to 100 removes the advantage. With enough data the variance is
already small, and there is nothing left for shrinkage to buy.`,
  },
  {
    id: 'u-curve',
    title: 'The U curve, in closed form',
    params: { mu: 2, sigma: 1.5, N: 5, lambda: 0.8, M: 1000 },
    view: 'tradeoff',
    visible: ['lambda', 'N'],
    notes: `MSE(λ) = 2(1−λ)²μ² + 2λ²σ²/N, and everything on this view is exact —
no Monte Carlo anywhere. The minimum sits at λ* = μ²/(μ²+σ²/N), which is
strictly below 1: the optimal estimator is always somewhat biased, and that is
an algebraic fact rather than an accident of the data.

Sliding λ along its yellow line to the green one makes the minimum concrete,
and raising N pushes λ* toward 1. The same U curve returns as ridge regression
in the polynomial-fit experiment — one idea, two costumes.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
