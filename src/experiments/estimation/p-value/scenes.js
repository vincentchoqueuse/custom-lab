// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2 · invoice 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'machine',
    title: 'One experiment, one area',
    view: 'statistic',
    params: { delta: 0.5, sigma: 1, N: 20, alpha: 0.05, M: 4000 },
    visible: ['delta', 'N'],
  },
  {
    id: 'under-null',
    title: 'Nothing going on — and p < 0.05 one time in twenty',
    view: 'calibration',
    params: { delta: 0, sigma: 1, N: 20, alpha: 0.05, M: 4000 },
    visible: ['delta', 'alpha', 'M'],
  },
  {
    id: 'bought-with-n',
    title: 'Significance is bought with N',
    view: 'power',
    params: { delta: 0.1, sigma: 1, N: 20, alpha: 0.05, M: 4000 },
    visible: ['delta', 'N', 'alpha'],
  },
];
