// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2-3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'shannon-ok',
    title: 'All is well (f ≪ Fs/2)',
    view: 'time',
    params: { source: 'sine', f: 5, Fs: 50 },
    visible: ['f', 'Fs'],
  },
  {
    id: 'wagon-wheel',
    title: 'Aliasing: the wagon wheel',
    view: 'time',
    params: { source: 'sine', f: 45, Fs: 50 },
    visible: ['f', 'Fs'],
  },
  {
    id: 'harmonics',
    title: 'A square wave folding back',
    params: { source: 'square', f: 15, Fs: 50 },
    view: 'spectrum',
    visible: ['f', 'Fs'],
  },
];
