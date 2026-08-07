// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2-3 · method 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'close',
    title: 'Closing the loop, and seeing what changes',
    params: { w0: 1, m: 0.5, K: 4 },
    view: 'response',
    visible: ['K', 'm'],
  },
  {
    id: 'faster',
    title: 'Faster and less damped, in the same ratio',
    params: { w0: 1, m: 0.5, K: 4 },
    view: 'gain',
    visible: ['K', 'w0'],
    lock: true,
  },
  {
    id: 'resonance',
    title: 'A well-behaved plant that starts to resonate',
    params: { w0: 1, m: 0.8, K: 1 },
    view: 'gain',
    visible: ['K', 'm'],
  },
  {
    id: 'nichols',
    title: 'The chart: reading the CLOSED loop on the OPEN one',
    params: { w0: 1, m: 0.5, K: 4 },
    view: 'black',
    visible: ['K', 'm'],
  },
];
