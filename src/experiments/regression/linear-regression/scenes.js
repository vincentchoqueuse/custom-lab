// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-3 · problem 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'least-squares',
    title: 'What "least squares" means',
    params: { a: 1.5, b: 1, sigma: 1, N: 20, spread: 3, outlier: 0 },
    view: 'fit',
    visible: ['sigma', 'N'],
  },
  {
    id: 'residuals',
    title: 'The residuals, the only honest diagnostic',
    params: { a: 1.5, b: 1, sigma: 1, N: 40, spread: 3, outlier: 0 },
    view: 'residuals',
    visible: ['sigma', 'N'],
  },
  {
    id: 'leverage',
    title: 'Spreading the x beats adding more',
    params: { a: 1.5, b: 1, sigma: 1.5, N: 20, spread: 1, outlier: 0 },
    view: 'slope-law',
    visible: ['spread', 'N'],
    lock: true,
  },
  {
    id: 'outlier',
    title: 'One point is enough to bend everything',
    params: { a: 1.5, b: 1, sigma: 0.6, N: 20, spread: 3, outlier: 0 },
    view: 'fit',
    visible: ['outlier', 'N'],
  },
];
