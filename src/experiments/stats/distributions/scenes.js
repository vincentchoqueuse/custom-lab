// Lecture script. Auto-discovered by the registry.
// PLAN — ATLAS, not an argument: each scene is a specimen of the catalogue. The
// context -> problem -> method plan does not apply.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'histogram',
    title: 'The histogram converges (Gaussian)',
    params: { law: 'gaussian', N: 100 },
    visible: ['law', 'N'],
  },
  {
    id: 'discrete',
    title: 'Discrete distributions (Poisson)',
    params: { law: 'poisson', N: 500 },
    visible: ['law', 'lambda'],
  },
  {
    id: 'cdf',
    title: 'The cumulative distribution function',
    params: { law: 'exponential', N: 100 },
    view: 'cdf',
    visible: ['law', 'N'],
  },
];
