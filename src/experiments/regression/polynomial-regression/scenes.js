// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2-3 · method 4-5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'right-model',
    title: 'The right model (d = 3)',
    view: 'fit',
    params: { d: 3, N: 30, sigma: 0.3, lambda: 0.001 },
    visible: ['d', 'N', 'sigma', 'lambda'],
  },
  {
    id: 'underfitting',
    title: 'Underfitting (d = 1)',
    view: 'fit',
    params: { d: 1, N: 30, sigma: 0.3, lambda: 0.001 },
    visible: ['d', 'N', 'lambda'],
  },
  {
    id: 'overfitting',
    title: 'Overfitting (d = 9)',
    view: 'fit',
    params: { d: 9, N: 15, sigma: 0.4, lambda: 0.001 },
    visible: ['d', 'N', 'lambda'],
  },
  {
    id: 'ridge',
    title: 'Ridge: taming degree 9',
    params: { d: 9, N: 15, sigma: 0.4, lambda: 0.001 },
    view: 'fit',
    visible: ['lambda', 'd', 'N'],
  },
  {
    id: 'tradeoff',
    title: 'The bias–variance trade-off',
    params: { d: 9, N: 15, sigma: 0.4, lambda: 1 },
    view: 'tradeoff',
    visible: ['lambda', 'd', 'N'],
  },
];
