// Lecture script. Auto-discovered by the registry.
// PLAN — context+problem 1 · method 2-3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'floor',
    title: 'The problem, then the floor',
    params: { mu: 2, sigma: 1.5, N: 20, M: 3000 },
    // The BOUND and the variances that run against it — which is what the notes
    // below were already describing while the scene opened on a single record.
    view: 'variance',
    visible: ['sigma', 'M'],
    notes: `The statement belongs on the board before anything is shown: N
independent values are drawn from N(μ, σ²) with σ known, and μ is to be
estimated. Everything on this screen answers that question and no other. Three
recipes turn the N draws into a μ̂ — the mean, the median, and the midrange,
which is the midpoint of the smallest and largest value. The drawer carries the
model and the Fisher information I(μ) = N/σ².

The dashed yellow line is σ²/N, and no unbiased estimator can go below it. That
is a theorem, not an observation about this particular figure. The mean sits on
the floor: it is efficient, and looking for something better is wasted effort.
The median runs parallel to it, a factor π/2 above. The midrange comes away
from both, its variance falling only as 1/ln N, so collecting more data barely
helps it. Raising σ lifts the whole floor as σ².

Two straight lines and a curve that bends away: that is the whole chapter, and
it is worth letting the room read the slopes before naming them. Then, and only
then, the first tab — one single record, watched while N grows, with the bound
drawn as a band around μ. What this figure says about M repetitions, that one
shows happening once. The mean's trace stays inside the band; the midrange
wanders out of it. Raising M here makes these three curves smoother without
moving them: M is how well the variance is MEASURED, N is what the variance
depends on, and confusing the two is the commonest reading error on this
screen.`,
  },
  {
    id: 'price',
    title: 'Three widths for one N',
    params: { mu: 2, sigma: 1.5, N: 50, M: 5000 },
    view: 'sampling',
    visible: ['N', 'sigma'],
    notes: `The same data budget buys three different precisions. The yellow
curve is the best distribution available — N(μ, σ²/N), dictated by Cramér–Rao —
and the histogram of x̄ fills it exactly.

What each estimator throws away is the useful question. The median discards the
values and keeps only the ranks. The midrange discards everything except two
points, and keeps the two worst ones. Efficiency is the Fisher information an
estimator actually consumes.`,
  },
  {
    id: 'efficiency',
    title: 'Efficiency, as a number',
    params: { mu: 2, sigma: 1.5, N: 100, M: 5000 },
    view: 'efficiency',
    visible: ['N', 'M'],
    notes: `The ratio CRB/Var puts the mean at 1 for every N. The median settles
at 2/π ≈ 0.637, the dashed green line: 36 % of the information discarded, and
discarded permanently rather than for small samples only — that is the price of
its robustness, which the bias–variance target experiment argues is often worth
paying. The midrange slides toward zero.

The link to the next chapter is the theorem that justifies it: the maximum
likelihood estimator is asymptotically efficient, which is to say it eventually
reaches this floor.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
