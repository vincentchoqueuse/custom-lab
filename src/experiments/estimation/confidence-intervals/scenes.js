// Lecture script — the file reopened the night before class. Auto-discovered
// by the registry. Defaults: view = first view, drawer = false.
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
    visible: ['conf'],
    notes: `At 1−α = 0.80 the red intervals become common enough to count, and
counting them out loud is the cheapest way to make the frequentist definition
concrete: roughly one in five misses, by construction rather than by accident.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
