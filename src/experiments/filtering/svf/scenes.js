// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'through',
    title: 'The signal goes in, the signal comes out',
    view: 'response',
    params: { source: 'square', f0: 110, fc: 500, Q: 2, output: 'lp' },
    visible: ['fc', 'output'],
  },
  {
    id: 'sculpt',
    title: 'Sculpting the harmonics',
    view: 'gain',
    params: { source: 'square', f0: 110, fc: 500, Q: 2, output: 'lp' },
    visible: ['fc', 'output'],
  },
  {
    id: 'resonance',
    title: 'Resonance sings',
    view: 'gain',
    params: { source: 'saw', f0: 110, fc: 550, Q: 12, output: 'lp' },
    visible: ['fc', 'Q'],
  },
  {
    id: 'four',
    title: 'Four filters for two multiplications',
    view: 'gain',
    params: { source: 'square', f0: 110, fc: 600, Q: 2, output: 'lp' },
    visible: ['output', 'Q', 'fc'],
  },
  {
    id: 'notch',
    title: 'The surgical notch',
    view: 'gain',
    params: { source: 'square', f0: 110, fc: 330, Q: 8, output: 'notch' },
    visible: ['fc', 'Q'],
  },
];
