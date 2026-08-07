// Lecture script — auto-discovered by the registry.
// Each scene IS a classic FIR, typed as coefficients: the URL carries them
// (?b=0.25,0.25,0.25,0.25), so any variation a student invents is a link.
// PLAN — context 1 · method 2-5 (each scene one filter, built by hand)
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'through',
    title: 'The signal goes in, the signal comes out',
    view: 'response',
    params: { b: [0.25, 0.25, 0.25, 0.25], source: 'square', f0: 125 },
    visible: ['source', 'f0'],
  },
  {
    id: 'moving-average',
    title: 'The moving average',
    view: 'gain',
    params: { b: [0.25, 0.25, 0.25, 0.25], source: 'square', f0: 125 },
    visible: ['b', 'source'],
  },
  {
    id: 'delay',
    title: 'The pure delay',
    view: 'response',
    params: { b: [0, 0, 0, 1], source: 'square', f0: 125 },
    visible: ['b', 'source'],
  },
  {
    id: 'difference',
    title: 'The differentiator',
    view: 'gain',
    params: { b: [1, -1], source: 'saw', f0: 125 },
    visible: ['b', 'source'],
  },
  {
    id: 'design',
    title: 'Building a band-pass by hand',
    view: 'gain',
    params: { b: [0.5, 0, -0.5], source: 'square', f0: 125 },
    visible: ['b', 'f0'],
  },
];
