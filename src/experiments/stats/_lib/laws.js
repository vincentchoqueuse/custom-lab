// Canonical sampling laws shared by the convergence experiments (central
// limit theorem, law of large numbers): one draw + exact first two moments.
// Fixed canonical parameters, except Bernoulli's p which comes from the
// experiment's params. Generic mathematics only — richer per-experiment law
// tables (pdf/cdf/ranges) stay in the experiments that need them.

export const canonicalLaws = {
  dice: {
    sample: (q, rand) => 1 + Math.floor(rand() * 6),
    mean: () => 3.5,
    variance: () => 35 / 12,
  },
  uniform: {
    sample: (q, rand) => rand(),
    mean: () => 0.5,
    variance: () => 1 / 12,
  },
  exponential: {
    sample: (q, rand) => -Math.log(1 - rand()),
    mean: () => 1,
    variance: () => 1,
  },
  bernoulli: {
    sample: (q, rand) => (rand() < q.p ? 1 : 0),
    mean: (q) => q.p,
    variance: (q) => q.p * (1 - q.p),
  },
};
