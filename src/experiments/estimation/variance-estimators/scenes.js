// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'agree',
    title: 'At N = 200 the two agree',
    view: 'sampling',
    params: { N: 200, M: 2000 },
    visible: ['N', 'sigma'],
  },

  {
    id: 'bias',
    title: 'The bias of σ̂² (÷N)',
    params: { N: 5, M: 2000 },
    visible: ['N', 'sigma'],
  },
  {
    id: 'vanishing',
    title: 'The bias vanishes as 1/N',
    params: { N: 5, M: 5000 },
    view: 'bias',
    visible: ['sigma', 'N'],
  },
  {
    id: 'price',
    title: 'What it costs: the spread',
    params: { N: 5, M: 20000 },
    visible: ['N', 'M'],
  },
];
