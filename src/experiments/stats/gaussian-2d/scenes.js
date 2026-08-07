// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2-3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'correlation',
    title: 'ρ tilts the cloud',
    params: { rho: 0.6, N: 500 },
    visible: ['rho', 'N'],
  },
  {
    id: 'regression',
    title: 'Regression ≠ principal axis',
    params: { rho: 0.6, sigmax: 1.5, sigmay: 1.5, N: 1000 },
    visible: ['rho', 'N'],
  },
  {
    id: 'marginals',
    title: 'The marginals ignore ρ',
    params: { rho: 0.9, sigmax: 1.5, sigmay: 1 },
    view: 'marginals',
    visible: ['rho', 'sigmax'],
  },
];
