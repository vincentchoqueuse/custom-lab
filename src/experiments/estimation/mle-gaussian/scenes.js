// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'principle',
    title: 'The principle (N = 20)',
    params: { N: 20 },
    visible: ['N', 'sigma'],
  },
  {
    id: 'variability',
    title: 'Little data (N = 5)',
    params: { N: 5 },
    visible: ['N', 'sigma'],
  },
  {
    id: 'likelihood',
    title: 'The log-likelihood',
    params: { N: 20 },
    view: 'loglik',
    visible: ['N', 'sigma'],
  },
];
