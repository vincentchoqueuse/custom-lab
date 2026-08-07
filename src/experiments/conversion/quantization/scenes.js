// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'staircase',
    title: 'The staircase',
    view: 'time',
    params: { b: 3, A: 0.9, f: 7.3, dither: false },
    visible: ['b', 'A'],
  },
  {
    id: 'uniform-error',
    title: 'The error is (almost) uniform',
    view: 'error-hist',
    params: { b: 8, A: 0.9, f: 7.3, dither: false },
    visible: ['b', 'dither'],
  },
  {
    id: 'six-db',
    title: '6 dB per bit',
    view: 'snr',
    params: { b: 8, A: 0.9, f: 7.3, dither: false },
    visible: ['b', 'A'],
  },
  {
    id: 'dither',
    title: 'Dither, or the noise that helps',
    view: 'error',
    params: { b: 3, A: 0.8, f: 7.3, dither: true },
    visible: ['b', 'dither'],
  },
];
