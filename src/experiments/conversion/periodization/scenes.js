// Lecture script — auto-discovered by the registry.
// PLAN — context 1-2 · problem 3 · method 4-5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'samples',
    title: 'The signal and its samples',
    params: { signal: 'gauss', fs: 600, tau: 5 },
    view: 'time',
    visible: ['signal', 'fs'],
  },
  {
    id: 'copies',
    title: 'The spectrum repeats itself',
    params: { signal: 'gauss', fs: 600, tau: 5 },
    view: 'periodize',
    visible: ['signal', 'fs'],
  },
  {
    id: 'overlap',
    title: 'They overlap, and that is aliasing',
    params: { signal: 'gauss', fs: 150, tau: 5 },
    view: 'periodize',
    visible: ['fs', 'tau'],
  },
  {
    id: 'bandlimited',
    title: 'The only genuinely band-limited signal',
    params: { signal: 'sinc', fs: 300, tau: 5 },
    view: 'periodize',
    visible: ['fs', 'signal'],
  },
  {
    id: 'dtft',
    title: 'What the samples know',
    params: { signal: 'triangle', fs: 250, tau: 5 },
    view: 'periodize',
    visible: ['signal', 'fs'],
  },
];
