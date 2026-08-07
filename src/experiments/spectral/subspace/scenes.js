// Lecture script — auto-discovered by the registry.
// PLAN — problem 1 · method 2-3 · problem 4 · method 5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'wall',
    title: 'The Fourier wall',
    // the wall IS a spectral statement, so the scene opens on the spectrum; the
    // record that produced it is one tab to the left
    view: 'spectrum',
    params: { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2 },
    visible: ['df', 'N'],
  },
  {
    id: 'eigen',
    title: 'Counting the sources',
    view: 'eigen',
    params: { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2 },
    visible: ['d', 'snr'],
  },
  {
    id: 'resolve',
    title: 'The model buys the resolution',
    view: 'pseudo',
    params: { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2 },
    visible: ['df', 'snr'],
  },
  {
    id: 'wrong-d',
    title: 'Getting d wrong',
    view: 'pseudo',
    params: { sources: 3, df: 0.5, snr: 25, N: 256, M: 32, d: 3 },
    visible: ['d', 'sources'],
  },
  {
    id: 'model',
    title: 'The complete model',
    view: 'model',
    params: { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2 },
    visible: ['snr', 'd'],
  },
];
