// Lecture script. Auto-discovered by the registry.
// PLAN — context+problem 1 · method 2-3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'floor',
    title: 'The problem, then the floor',
    params: { mu: 2, sigma: 1.5, N: 20, M: 3000 },
    // The BOUND and the variances that run against it — which is what the notes
    // below were already describing while the scene opened on a single record.
    view: 'variance',
    visible: ['sigma', 'M'],
  },
  {
    id: 'price',
    title: 'Three widths for one N',
    params: { mu: 2, sigma: 1.5, N: 50, M: 5000 },
    view: 'sampling',
    visible: ['N', 'sigma'],
  },
  {
    id: 'efficiency',
    title: 'Efficiency, as a number',
    params: { mu: 2, sigma: 1.5, N: 100, M: 5000 },
    view: 'efficiency',
    visible: ['N', 'M'],
  },
];
