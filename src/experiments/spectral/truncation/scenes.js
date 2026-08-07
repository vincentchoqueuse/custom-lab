// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3-4 · problem 5-6
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'cut',
    title: 'What the window throws away',
    params: { sig: 'sine', T: 40, win: 'rect', f0: 300 },
    view: 'time',
    visible: ['T', 'win'],
  },
  {
    id: 'lobe',
    title: 'A line becomes a lobe of width 1/T',
    params: { sig: 'sine', T: 40, win: 'rect', f0: 300 },
    view: 'spectrum',
    visible: ['T', 'win'],
    lock: true,
  },
  {
    id: 'window',
    title: 'The shape of the cut sets the skirts',
    params: { sig: 'sine', T: 40, win: 'rect', f0: 300 },
    view: 'spectrum',
    visible: ['win', 'T'],
    lock: true,
  },
  {
    id: 'law',
    title: 'The 1/T law, measured',
    params: { sig: 'sine', T: 40, win: 'rect', f0: 300 },
    view: 'width',
    visible: ['T', 'win'],
  },
  {
    id: 'gabor',
    title: 'The chirp: longer is no longer better',
    params: { sig: 'chirp', T: 20, win: 'hann', f0: 300, k: 2000 },
    view: 'width',
    visible: ['T', 'k', 'win'],
  },
  {
    id: 'damped',
    title: 'When the signal has already fallen silent',
    params: { sig: 'damped', T: 20, win: 'rect', f0: 300, tau: 15 },
    view: 'width',
    visible: ['T', 'tau', 'win'],
  },
];
