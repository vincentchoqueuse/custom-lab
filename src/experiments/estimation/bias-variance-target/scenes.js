// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'vocabulary',
    title: 'Four marksmen, one vocabulary',
    view: 'targets',
    params: { mu: 2, sigma: 1.5, N: 5, lambda: 0.8, M: 400 },
    visible: ['N', 'sigma'],
  },
  {
    id: 'useful-bias',
    title: 'The bias that wins',
    view: 'targets',
    params: { mu: 2, sigma: 1.5, N: 5, lambda: 0.8, M: 1000 },
    visible: ['lambda', 'N'],
  },
  {
    id: 'u-curve',
    title: 'The U curve, in closed form',
    params: { mu: 2, sigma: 1.5, N: 5, lambda: 0.8, M: 1000 },
    view: 'tradeoff',
    visible: ['lambda', 'N'],
  },
];
