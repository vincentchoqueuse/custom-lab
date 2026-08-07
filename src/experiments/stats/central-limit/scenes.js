// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2-3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'dice',
    title: 'The mean of n dice',
    params: { law: 'dice', n: 1, M: 5000 },
    visible: ['law', 'n'],
  },
  {
    id: 'skewed',
    title: 'Even a badly skewed distribution',
    params: { law: 'exponential', n: 1, M: 5000 },
    visible: ['law', 'n'],
  },
  {
    id: 'coin',
    title: 'A biased coin (p = 0.1)',
    params: { law: 'bernoulli', p: 0.1, n: 100, M: 5000 },
    visible: ['law', 'n', 'p'],
  },
];
