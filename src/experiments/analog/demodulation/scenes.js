// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2 · problem 3-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'envelope',
    title: 'Two pieces of information in one curve',
    view: 'time',
    params: { fc: 1000, ka: 0.5, fam: 40, fdev: 200, ffm: 25, snr: 40 },
    visible: ['ka', 'snr'],
  },
  {
    id: 'frequency',
    title: 'And the frequency, from the same curve',
    view: 'freq',
    params: { fc: 1000, ka: 0.5, fam: 40, fdev: 200, ffm: 25, snr: 40 },
    visible: ['fdev', 'ffm'],
  },
  {
    id: 'noise',
    title: 'What locality costs',
    view: 'freq',
    params: { fc: 1000, ka: 0.5, fam: 40, fdev: 200, ffm: 25, snr: 20 },
    visible: ['snr', 'ka'],
  },
  {
    id: 'fold',
    title: 'Where Teager folds back',
    view: 'freq',
    params: { fc: 1800, ka: 0.5, fam: 40, fdev: 400, ffm: 25, snr: 50 },
    visible: ['fc', 'fdev'],
  },
];
