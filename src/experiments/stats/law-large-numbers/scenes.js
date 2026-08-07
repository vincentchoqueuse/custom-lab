// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'convergence',
    title: 'Every path converges',
    params: { law: 'dice', n: 2000, K: 5 },
    visible: ['law', 'K'],
  },
  {
    id: 'slowness',
    title: 'Convergence is slow (1/√n)',
    params: { law: 'dice', n: 10000, K: 5 },
    visible: ['n', 'law'],
  },
  {
    id: 'coin',
    title: 'Coin tossing: the frequency converges',
    params: { law: 'bernoulli', p: 0.5, n: 5000, K: 10 },
    visible: ['law', 'p'],
  },
];
