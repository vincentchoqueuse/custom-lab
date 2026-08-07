// Lecture script. Auto-discovered by the registry.
const BASE = {
  a: 1.5,
  b: 1,
  sigma: 0.7,
  N: 40,
  spread: 3,
  contam: 0.05,
  shift: 12,
  pattern: 'scatter',
  method: 'huber',
  delta: 1.5,
  thr: 1.5,
  seed: 34,
};

// PLAN — context 1 · problem 2-3 · method 4 · invoice 5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'clean',
    title: 'Clean data: least squares is the right answer',
    view: 'fit',
    params: { ...BASE, contam: 0, shift: 0 },
    visible: ['sigma', 'N'],
  },

  {
    id: 'one-point',
    title: 'Two points out of forty',
    view: 'fit',
    params: { ...BASE, contam: 0.05, shift: 12 },
    visible: ['shift', 'contam'],
  },
  {
    id: 'why',
    title: 'The square is the problem',
    view: 'loss',
    params: { ...BASE, contam: 0.05, shift: 12, delta: 1.5 },
    visible: ['delta', 'method'],
  },
  {
    id: 'breakdown',
    title: 'How much contamination each one survives',
    view: 'breakdown',
    params: { ...BASE, contam: 0.05, shift: 12, method: 'huber' },
    visible: ['contam', 'method', 'pattern'],
  },
  {
    id: 'price',
    title: 'What robustness costs on clean data',
    view: 'fit',
    params: { ...BASE, contam: 0, shift: 0, sigma: 1.2, method: 'l1' },
    visible: ['method', 'sigma'],
  },
];
