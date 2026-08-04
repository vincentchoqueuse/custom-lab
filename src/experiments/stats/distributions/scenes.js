// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'histogram',
    title: 'The histogram converges (Gaussian)',
    params: { law: 'gaussian', N: 100 },
    visible: ['law', 'N'],
    notes: `At N = 100 the blue histogram shivers around the orange density, and
pressing R repeatedly makes the shivering the point: every draw is a different
histogram of the same distribution. Raising N to ten thousand settles it onto
the curve, which is the law of large numbers seen directly.

The statline carries the same story in numbers — x̄ against E[X], s² against
Var(X) — and it is worth reading after each draw. Switching distribution on the
pill shows that none of this depended on the Gaussian.`,
  },
  {
    id: 'discrete',
    title: 'Discrete distributions (Poisson)',
    params: { law: 'poisson', N: 500 },
    visible: ['law', 'lambda'],
    notes: `The blue bars are observed frequencies, the orange ones are
probabilities, and the question to put to the room is why the two never match
exactly. They are not the same kind of object: one is measured, the other is a
model, and only an infinite sample would close the gap.

Moving to the binomial with n large and p small and then back to Poisson shows
the same silhouette twice. That is the binomial → Poisson limit, with np = λ,
and it is easier to believe as a superposition than as an algebraic argument.`,
  },
  {
    id: 'cdf',
    title: 'The cumulative distribution function',
    params: { law: 'exponential', N: 100 },
    view: 'cdf',
    visible: ['law', 'N'],
    notes: `The blue staircase is the sampled CDF and every step is exactly 1/N,
which is why dropping N to 10 makes the steps countable and raising it to ten
thousand makes them disappear into the orange curve.

Switching to a discrete distribution changes the nature of the comparison: the
theoretical CDF becomes a staircase itself, and the two staircases differ only
in the height of their steps.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
