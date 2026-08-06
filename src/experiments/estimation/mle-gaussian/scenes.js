// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'principle',
    title: 'The principle (N = 20)',
    params: { N: 20 },
    visible: ['N', 'sigma'],
    notes: `Each press of R redraws the purple sample, moves the orange estimated
density and leaves the blue true one where it is. The two estimates μ̂ and σ̂
are in the statline, and the gap between the curves is the estimation error made
visible.

Asking how many draws it takes for the orange curve to sit on the blue one
invites a number, and raising N answers it — the curve stabilizes long before it
coincides, which is itself worth noticing.`,
  },
  {
    id: 'variability',
    title: 'Little data (N = 5)',
    params: { N: 5 },
    visible: ['N', 'sigma'],
    notes: `Holding R at N = 5 makes the estimated density dance, and that dance
is exactly the variance of the estimator — one number per draw, seen as a curve.

Worth reading in the statline as it moves: σ̂, the maximum likelihood estimate
that divides by N, sits below σ on average. Dividing by N−1 instead gives the
unbiased estimator, which the next experiment takes apart.`,
  },
  {
    id: 'likelihood',
    title: 'The log-likelihood',
    params: { N: 20 },
    view: 'loglik',
    visible: ['N', 'sigma'],
    notes: `The curve ℓ(μ) peaks at μ̂, the dashed orange line, and not at μ, the
blue one. The estimator maximizes the likelihood of the data that were observed,
not of the truth, and the distance between the two lines is what that costs on
this particular sample.

Increasing N tightens the curve around its peak. That curvature is the Fisher
information, which is why a sharper peak and a smaller variance are the same
statement.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
