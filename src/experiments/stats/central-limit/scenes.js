// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'dice',
    title: 'The mean of n dice',
    params: { law: 'dice', n: 1, M: 5000 },
    visible: ['law', 'n'],
    notes: `At n = 1 the histogram is a flat comb with six teeth, and nothing
about it is Gaussian. Raising n gives a triangle at 2, a bell at 5, and by 30 a
curve the eye cannot tell from the orange one.

The orange curve N(μ, σ²/n) always carries the right mean and the right
variance, whatever n is. Only the SHAPE of the histogram comes to meet it as n
grows, and that shape is the whole content of the central limit theorem.`,
  },
  {
    id: 'skewed',
    title: 'Even a badly skewed distribution',
    params: { law: 'exponential', n: 1, M: 5000 },
    visible: ['law', 'n'],
    notes: `The exponential is brutally skewed, and at n = 1 the Gaussian sits
well beside it rather than on it. The bump recenters by n = 5, becomes symmetric
by 30, and is Gaussian by 100 — the theorem asks nothing of the underlying
distribution beyond a finite variance.

Worth pointing at σ/√n in the drawer while n moves: the bell narrows at the same
time as it becomes a bell, and these are two different statements.`,
  },
  {
    id: 'coin',
    title: 'A biased coin (p = 0.1)',
    params: { law: 'bernoulli', p: 0.1, n: 100, M: 5000 },
    visible: ['law', 'n', 'p'],
    notes: `The draws are zeros and ones, almost always zero, and yet the mean of
a hundred tosses is already Gaussian — the de Moivre–Laplace theorem, which
history met a century before the general case.

Dropping n to 10 brings the discrete structure back: the means can only land on
multiples of 1/10, and the histogram becomes a comb again. This is where the
np(1−p) ≳ 10 rule of thumb becomes visible rather than asserted.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
