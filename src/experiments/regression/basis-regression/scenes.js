// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'bumps',
    title: 'A sum of bumps',
    params: { basis: 'rbf', target: 'damped', M: 8, ell: 0.15, lambda: 1e-8, N: 60, sigma: 0.1 },
    view: 'basis',
    visible: ['ell', 'M', 'lambda'],
  },
  {
    id: 'square-wave',
    title: 'The square wave separates the bases',
    view: 'fit',
    params: { basis: 'fourier', target: 'square', M: 19, ell: 0.05, lambda: 1e-8, N: 150, sigma: 0.02 },
    visible: ['basis', 'M', 'lambda'],
  },
  {
    id: 'train-test',
    title: 'The curve that is worth a chapter of ML',
    params: { basis: 'rbf', target: 'damped', M: 8, ell: 0.12, lambda: 1e-8, N: 40, sigma: 0.15 },
    view: 'complexity',
    visible: ['M', 'sigma', 'lambda'],
  },
];
