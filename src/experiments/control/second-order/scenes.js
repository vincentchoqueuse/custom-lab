// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · method 2-3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'regimes',
    title: 'The three regimes',
    view: 'step',
    params: { K: 1, m: 0.3, w0: 2 },
    visible: ['m', 'w0'],
  },
  {
    id: 'poles',
    title: 'The poles travel along the circle',
    params: { K: 1, m: 0.3, w0: 2 },
    view: 'poles',
    visible: ['m', 'w0'],
  },
  {
    id: 'resonance',
    title: 'Resonance — and identification',
    params: { K: 1, m: 0.2, w0: 2 },
    view: 'gain',
    visible: ['m', 'w0'],
  },
];
