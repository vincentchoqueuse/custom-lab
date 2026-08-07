// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2-3 · method 4 · invoice 5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'through',
    title: 'The signal goes in, the signal comes out',
    view: 'response',
    params: { fc: 1000, N: 21, win: 'hann' },
    visible: ['fc', 'N'],
  },
  {
    id: 'truncate',
    title: 'Truncating the infinite',
    view: 'impulse',
    params: { fc: 1000, N: 21, win: 'rect' },
    visible: ['N', 'win'],
  },
  {
    id: 'gibbs',
    title: 'Gibbs does not give way',
    view: 'gain',
    params: { fc: 1000, N: 21, win: 'rect' },
    visible: ['N', 'win'],
  },
  {
    id: 'windows',
    title: 'The window buys decibels',
    view: 'gain',
    params: { fc: 1000, N: 45, win: 'rect' },
    visible: ['win', 'N'],
  },
  {
    id: 'delay',
    title: 'Clean, but late',
    view: 'response',
    params: { fc: 500, N: 81, win: 'hamming' },
    visible: ['N', 'fc'],
  },
];
