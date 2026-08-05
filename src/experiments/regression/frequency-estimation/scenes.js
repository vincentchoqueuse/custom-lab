// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'fine-grid',
    title: 'A fine grid finds everything',
    params: { f: 5, sigma: 0.3, step: 0.05 },
    view: 'time',
    visible: ['step', 'sigma'],
    notes: `The purple points are the evaluations of J. The grid sweeps
everything, so no basin can hide from it, at a cost of about 380 evaluations as
the statline reports. The secondary minima are spaced by 1/T = 1 Hz.

The question that leads to the next scene: what does halving the step cost, and
what does it buy?`,
  },
  {
    id: 'step-too-large',
    title: 'The step that steps over the basin',
    params: { f: 5, sigma: 0.3, step: 1.3 },
    view: 'cost',
    visible: ['step'],
    notes: `With Δf = 1.3 Hz, larger than the basin width 1/T = 1 Hz, the grid
can straddle the true minimum entirely and f̂ lands somewhere else — the
statline shows |f̂−f| jump accordingly.

Freezing and then reducing the step until the right minimum is caught again
makes the rule concrete: the step must be small compared with 1/T. This is the
first estimator sizing calculation of the course.`,
  },
  {
    id: 'quantization',
    title: 'Without noise, the error remains',
    params: { f: 5, sigma: 0, step: 0.4 },
    view: 'cost',
    visible: ['step', 'sigma'],
    notes: `At σ = 0 there is no noise at all, and yet |f̂−f| is not zero: an
argmin over a grid cannot do better than ±Δf/2, which is quantization and not
estimation error. Lowering Δf makes the error follow it down.

Even at Δf → 0 the noise imposes its own limit, which is the Cramér–Rao bound
and has an experiment of its own. Doing better than a grid at equal cost is the
subject of the optimization chapter.`,
  },
  {
    id: 'reconstructed',
    title: 'The reconstructed signal',
    params: { f: 5, sigma: 0.5, step: 0.05 },
    view: 'time',
    visible: ['sigma', 'f'],
    notes: `The orange sinusoid, at frequency f̂, sits back on the purple
observations. Pressing R changes the noise and barely moves f̂ — frequency
estimation is surprisingly precise, its Cramér–Rao bound falling as 1/T³.

Raising σ toward 2 finds the point where it finally breaks down, which is worth
locating rather than assuming.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
