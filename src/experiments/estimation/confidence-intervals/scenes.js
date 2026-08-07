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
  },
  {
    id: 'level-80',
    title: 'Level α = 0.20',
    view: 'realizations',
    params: { conf: 0.8 },
    visible: ['conf', 'N'],
  },
  {
    id: 'which-law',
    title: 'Student or Gauss — and what the choice costs',
    view: 'coverage',
    params: { N: 30, conf: 0.95, known: true },
    visible: ['known', 'N'],
  },
];
