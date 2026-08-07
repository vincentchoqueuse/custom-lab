// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'converge',
    title: 'A filter that learns',
    view: 'signals',
    params: { algo: 'lms', mu: 0.01, lambda: 1, L: 8, a: 0, snr: 20, n: 240, track: false },
    visible: ['n', 'mu'],
  },
  {
    id: 'tradeoff',
    title: 'Fast or accurate, pick one',
    view: 'learning',
    params: { algo: 'lms', mu: 0.05, lambda: 1, L: 8, a: 0, snr: 20, n: 3000, track: false },
    visible: ['mu', 'snr'],
  },
  {
    id: 'colored',
    title: 'A coloured input, or what RLS buys',
    view: 'learning',
    params: { algo: 'lms', mu: 0.01, lambda: 1, L: 8, a: 0.9, snr: 20, n: 3000, track: false },
    visible: ['a', 'algo'],
  },
  {
    id: 'track',
    title: 'Tracking a system that moves',
    view: 'learning',
    params: { algo: 'rls', mu: 0.01, lambda: 1, L: 8, a: 0, snr: 20, n: 3000, track: true },
    visible: ['lambda', 'algo'],
  },
];
