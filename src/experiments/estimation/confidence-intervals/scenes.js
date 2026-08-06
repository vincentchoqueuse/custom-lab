// Lecture script — the file reopened the night before class. Auto-discovered
// by the registry. Defaults: view = first view, drawer = false.
// PLAN — context 1 · problem 2 · method 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'all-is-well',
    title: 'All is well (N = 30)',
    view: 'realizations',
    params: { N: 30, conf: 0.95 },
    visible: ['N', 'conf'], // Prompt Bar pills
    masked: [], // black box: pill shows "?", revealHidden action
    notes: `The question to put to the room before touching N: if N goes from 30
to 200, does the coverage change? Most of them will answer that it goes up, and
it is worth collecting that answer out loud before moving the slider.

It does not. The intervals get narrower and the proportion containing μ stays at
95 %, because the level is what was asked for and the width is what it costs.`,
  },
  {
    id: 'level-80',
    title: 'Level α = 0.20',
    view: 'realizations',
    params: { conf: 0.8 },
    visible: ['conf', 'N'],
    notes: `At 1−α = 0.80 the red intervals become common enough to count, and
counting them out loud is the cheapest way to make the frequentist definition
concrete: roughly one in five misses, by construction rather than by accident.`,
  },
  {
    id: 'which-law',
    title: 'Student or Gauss — and what the choice costs',
    view: 'coverage',
    params: { N: 30, conf: 0.95, known: true },
    visible: ['known', 'N'],
    notes: `The method, and the scene the first two were building to: the
interval has to be built from a LAW, and which law depends on what is known.

Start with σ known, the Gaussian interval, and read the coverage: it sits on
0.95 at every N. Then switch to σ unknown. If the same 1.96 were kept, the
interval would be too narrow and the coverage would fall below the level — the
data has been used twice, once for x̄ and once for σ̂, and the second use costs
something. Student's t is exactly the price, and the drawer prints the degrees
of freedom.

Take N down to 5 and back with the switch flipping between the two. At N = 30
the two laws differ by two percent and nobody would notice; at N = 5 the
Student quantile is 2.78 against 1.96, forty percent wider. That is the whole
practical content of the t distribution, and it is visible in one gesture.

Worth ending on: the coverage curve is flat for BOTH laws, once each is used
where it belongs. A correct interval does not become more correct with more
data — it becomes narrower.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
