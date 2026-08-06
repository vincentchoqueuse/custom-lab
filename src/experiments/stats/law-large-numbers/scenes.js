// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'convergence',
    title: 'Every path converges',
    params: { law: 'dice', n: 2000, K: 5 },
    visible: ['law', 'K'],
    notes: `The K paths are running means of n dice. They wander early, then all
of them settle inside the yellow funnel μ ± 2σ/√n, which holds about 95 % of
each path. Pressing R gives new paths and the same fate — the law of large
numbers leaves nothing to chance about the destination, only about the road.

The link with the previous experiment is worth making out loud: at a fixed n,
the vertical spread of the paths is Gaussian. This figure is the central limit
theorem seen edge-on.`,
  },
  {
    id: 'slowness',
    title: 'Convergence is slow (1/√n)',
    params: { law: 'dice', n: 10000, K: 5 },
    visible: ['n', 'law'],
    notes: `The horizontal axis is logarithmic, and that is what makes the cost
readable: the funnel narrows by a factor of ten every two orders of magnitude,
so one more digit of precision costs a hundred times more draws.

Asking how many tosses three decimals on μ = 3.5 would take gives roughly three
million — beyond the slider, which is the message rather than a limitation of
the experiment.`,
  },
  {
    id: 'coin',
    title: 'Coin tossing: the frequency converges',
    params: { law: 'bernoulli', p: 0.5, n: 5000, K: 10 },
    visible: ['law', 'p'],
    notes: `The frequency of heads converges to p, which is the experiment
history actually ran: Buffon with 4040 tosses, Pearson with 24 000. Ten paths of
five thousand tosses now cost one keystroke, and the comparison of effort is
part of the lesson.

Dropping p to 0.05 shows that relative convergence is far slower for a rare
event. Estimating something that almost never happens takes a great deal of
data, and this is where that becomes concrete.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
