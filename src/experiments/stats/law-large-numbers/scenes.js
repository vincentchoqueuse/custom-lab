// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'convergence',
    title: 'Every path converges',
    params: { law: 'dice', n: 2000, K: 5 },
    visible: ['law', 'K'],
    notes: `K paths of the mean of n dice: they wander, then ALL of them settle
inside the yellow funnel μ ± 2σ/√n (~95 % of each path).
Hammer R: new paths, same fate. That is the LLN — no chance about the
destination, only about the road.
Tie it to the CLT: at fixed n, the vertical spread of the paths is Gaussian —
this is the previous experiment seen edge-on.`,
  },
  {
    id: 'slowness',
    title: 'Convergence is slow (1/√n)',
    params: { law: 'dice', n: 10000, K: 5 },
    visible: ['n'],
    notes: `The axis is LOGARITHMIC: the funnel narrows by a factor of 10 every
TWO orders of magnitude — one more digit of precision costs a hundred times
more draws (1/√n).
Question: "how many tosses for three decimals on μ = 3.5?"
(≈ 3×10⁶ — out of reach of the slider, and that is the message.)`,
  },
  {
    id: 'coin',
    title: 'Coin tossing: the frequency converges',
    params: { law: 'bernoulli', p: 0.5, n: 5000, K: 10 },
    visible: ['law', 'p'],
    notes: `The frequency of heads converges to p — the historical experiment
(Buffon: 4040 tosses; Pearson: 24 000). Here: 10 paths of 5000 tosses in one
press of R.
Drop p to 0.05: relative convergence is far slower — rare events need a lot
of data.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
