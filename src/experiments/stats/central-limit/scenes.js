// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'dice',
    title: 'The mean of n dice',
    params: { law: 'dice', n: 1, M: 5000 },
    visible: ['law', 'n'],
    notes: `n=1: a flat comb with six teeth — nothing Gaussian about it.
Raise n live: 2 (triangle), 5 (bell), 30 (a perfect Gaussian).
The orange curve N(μ, σ²/n) ALWAYS has the right mean and the right variance:
only the SHAPE of the histogram comes to meet it as n grows. That is the CLT.`,
  },
  {
    id: 'skewed',
    title: 'Even a badly skewed distribution',
    params: { law: 'exponential', n: 1, M: 5000 },
    visible: ['law', 'n'],
    notes: `n=1: the exponential, brutally skewed — the Gaussian sits well beside it.
n=5: the bump recenters. n=30: symmetric. n=100: Gaussian.
Point at σ/√n in the drawer: the bell narrows at the same time.`,
  },
  {
    id: 'coin',
    title: 'A biased coin (p=0.1)',
    params: { law: 'bernoulli', p: 0.1, n: 100, M: 5000 },
    visible: ['law', 'n', 'p'],
    notes: `Zeros and ones, almost always zero — and yet the mean of 100 tosses is
already Gaussian (de Moivre–Laplace). Drop n to 10: the discrete structure comes
back (multiples of 1/10). The np(1−p) ≳ 10 rule of thumb is visible to the eye.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
