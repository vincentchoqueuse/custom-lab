// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'candidates',
    title: 'Three candidates for θ',
    view: 'realization',
    params: { theta: 5, N: 10, M: 3000 },
    visible: ['N', 'theta'],
  },
  {
    id: 'bias',
    title: 'The bias of the maximum',
    params: { theta: 5, N: 10, M: 5000 },
    view: 'sampling',
    visible: ['N', 'theta'],
  },
  {
    id: 'rate',
    title: 'The rate: 1/N against 1/√N',
    params: { theta: 5, N: 10, M: 5000 },
    view: 'rmse',
    visible: ['N', 'theta'],
  },
];
