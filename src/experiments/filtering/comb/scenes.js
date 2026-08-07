// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'through',
    title: 'The signal goes in, the echoes come out',
    view: 'response',
    params: { structure: 'fb', D: 40, g: 0.9, source: 'square', f0: 110 },
    visible: ['D', 'g'],
  },
  {
    id: 'teeth',
    title: 'The echo makes a comb',
    view: 'gain',
    params: { structure: 'fb', D: 40, g: 0.9, source: 'square', f0: 110 },
    visible: ['D', 'g'],
  },
  {
    id: 'echo',
    title: 'Two spikes, or infinitely many',
    view: 'impulse',
    params: { structure: 'fb', D: 40, g: 0.7, source: 'square', f0: 110 },
    visible: ['structure', 'g'],
  },
  {
    id: 'align',
    title: 'Teeth on harmonics',
    view: 'gain',
    params: { structure: 'fb', D: 32, g: 0.8, source: 'square', f0: 250 },
    visible: ['D', 'g'],
  },
  {
    id: 'sign',
    title: 'The complementary comb',
    view: 'gain',
    params: { structure: 'fb', D: 40, g: 0.9, source: 'saw', f0: 110 },
    visible: ['g', 'D'],
  },
];
