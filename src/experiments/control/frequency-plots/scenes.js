// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-5 · problem 6
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'first',
    title: 'A first order, read four times',
    params: { sys: 'first', K: 1, tau: 1, wc: 1 },
    view: 'gain',
    visible: ['sys', 'wc'],
  },
  {
    id: 'halfcircle',
    title: 'The first order IS a half-circle',
    params: { sys: 'first', K: 1, tau: 1, wc: 1 },
    view: 'nyquist',
    visible: ['wc', 'K'],
  },
  {
    id: 'damped',
    title: 'A damped second order (m = 1.2)',
    params: { sys: 'second', K: 1, w0: 1, m: 1.2, wc: 1 },
    view: 'gain',
    visible: ['m', 'wc'],
  },
  {
    id: 'resonant',
    title: 'A resonant second order (m = 0.3)',
    params: { sys: 'second', K: 1, w0: 1, m: 0.3, wc: 1 },
    view: 'gain',
    visible: ['m', 'wc'],
    lock: true,
  },
  {
    id: 'margins',
    title: 'The margins, read on all three diagrams',
    params: { sys: 'openloop', K: 1, tau: 1, wc: 0.78 },
    view: 'gain',
    visible: ['K', 'wc'],
  },
  {
    id: 'unstable',
    title: 'Raising K until the loop diverges',
    params: { sys: 'openloop', K: 1, tau: 1, wc: 2.24 },
    view: 'nyquist',
    visible: ['sys', 'K'],
  },
];
