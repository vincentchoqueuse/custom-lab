// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3-5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'gabor',
    title: 'The Gabor trade-off',
    view: 'map',
    params: { source: 'chirp', f1: 900, N: 256, win: 'hann', tcut: 1 },
    visible: ['source', 'win', 'N'],
  },
  {
    id: 'tones',
    title: 'Two notes: how long to tell them apart?',
    view: 'map',
    params: { source: 'tones', df: 15, N: 64, win: 'hann', tcut: 1 },
    visible: ['source', 'win', 'N', 'df'],
  },
  {
    id: 'aliasing',
    title: 'The bounce off Nyquist',
    view: 'map',
    params: { source: 'chirp', f1: 2800, N: 256, win: 'hann', tcut: 1 },
    visible: ['source', 'win', 'f1'],
  },
  {
    id: 'am',
    title: 'Two descriptions of the same signal',
    view: 'map',
    params: { source: 'am', fm: 8, N: 128, win: 'hann', tcut: 1 },
    visible: ['source', 'win', 'fm'],
  },
  {
    id: 'fm',
    title: 'Two ridges crossing',
    view: 'map',
    params: { source: 'fm', f1: 900, fmod: 1, fdev: 150, N: 256, win: 'hann', tcut: 0.5 },
    visible: ['source', 'win', 'fmod', 'fdev'],
  },
];
