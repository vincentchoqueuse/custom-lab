// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'at-work',
    title: 'The filter at work',
    view: 'tracking',
    params: { sigw: 0.1, sigv: 1, N: 120 },
    visible: ['sigv', 'sigw'],
  },
  {
    id: 'good-sensor',
    title: 'Excellent sensor, uncertain model',
    view: 'tracking',
    params: { sigw: 0.5, sigv: 0.05, N: 120 },
    visible: ['sigv', 'sigw'],
  },
  {
    id: 'good-model',
    title: 'Poor sensor, trusted model',
    view: 'tracking',
    params: { sigw: 0.01, sigv: 3, N: 120 },
    visible: ['sigv', 'sigw'],
  },
  {
    id: 'consistency',
    title: 'The filter knows itself',
    view: 'consistency',
    params: { sigw: 0.1, sigv: 1, N: 500 },
    visible: ['N', 'sigv'],
  },
];
