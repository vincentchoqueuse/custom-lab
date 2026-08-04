// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'histogram',
    title: 'The histogram converges (Gaussian)',
    params: { law: 'gaussian', N: 100 },
    visible: ['law', 'N'],
    notes: `At N=100, hammer R: the blue histogram shivers around the orange pdf.
Raise N on the pill (up to 10 000): it settles onto the curve — law of large numbers.
Compare x̄ / E[X] and s² / Var(X) in the statline after every draw.
Switch distribution on the pill to show that the phenomenon is universal.`,
  },
  {
    id: 'discrete',
    title: 'Discrete distributions (Poisson)',
    params: { law: 'poisson', N: 500 },
    visible: ['law', 'lambda'],
    notes: `Blue bars (observed frequencies) against orange bars (probabilities).
Question: "why do the blue bars never match exactly?"
Move to the binomial with n large and p small, then back to Poisson:
same silhouette — that is the binomial → Poisson limit (np = λ).`,
  },
  {
    id: 'cdf',
    title: 'The cumulative distribution function',
    params: { law: 'exponential', N: 100 },
    view: 'cdf',
    visible: ['law', 'N'],
    notes: `The blue staircase (sampled) against the orange curve: every step is 1/N.
Drop N to 10 to see the steps, raise it to 10 000 to make them vanish.
Switch to a discrete distribution: the theoretical CDF becomes a staircase itself.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
