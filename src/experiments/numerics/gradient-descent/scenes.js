// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3 · problem 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'bowl',
    title: 'A round bowl, and the descent goes straight in',
    view: 'landscape',
    params: { fn: 'quad', kappa: 1, alpha: 0.18, beta: 0.27, N: 30 },
    visible: ['kappa', 'alpha'],
  },

  {
    id: 'zigzag',
    title: 'The valley and the zigzag',
    params: { fn: 'quad', kappa: 10, alpha: 0.18, beta: 0.27, N: 30 },
    visible: ['alpha', 'kappa', 'beta'],
  },
  {
    id: 'rate',
    title: 'The slope IS the conditioning',
    params: { fn: 'quad', kappa: 30, alpha: 0.064, beta: 0.478, N: 60 },
    view: 'convergence',
    visible: ['kappa', 'alpha'],
  },
  {
    id: 'banana',
    title: 'Rosenbrock, the curved valley',
    params: { fn: 'rosenbrock', alpha: 0.0015, beta: 0.9, N: 100 },
    visible: ['fn', 'alpha'],
  },
];
