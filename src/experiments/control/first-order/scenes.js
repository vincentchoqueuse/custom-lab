// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-4 · problem 5-6
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'tau',
    title: 'τ, and nothing else',
    params: { K: 1, tau: 1, tz: 0 },
    view: 'step',
    visible: ['tau', 'K'],
  },
  {
    id: 'impulse',
    title: 'The impulse response is the derivative',
    params: { K: 1, tau: 1, tz: 0 },
    view: 'impulse',
    visible: ['tau', 'K'],
  },
  {
    id: 'pole',
    title: 'One pole, one speed',
    params: { K: 1, tau: 1, tz: 0 },
    view: 'poles',
    visible: ['tau', 'K'],
  },
  {
    id: 'bode',
    title: 'The same system, seen in frequency',
    params: { K: 1, tau: 1, tz: 0 },
    view: 'gain',
    visible: ['tau', 'K'],
    lock: true,
  },
  {
    id: 'zero',
    title: 'One zero, and the output jumps',
    params: { K: 1, tau: 1, tz: 0.5 },
    view: 'step',
    visible: ['tz', 'tau'],
  },
  {
    id: 'nmp',
    title: 'Non-minimum phase: it starts the wrong way',
    params: { K: 1, tau: 1, tz: -0.6 },
    view: 'step',
    visible: ['tz', 'tau'],
  },
];
