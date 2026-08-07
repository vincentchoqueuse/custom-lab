// Auto-discovered by the registry. Defaults: view = first view, drawer = false.
// PLAN — ATLAS: seven signals visited one by one. No single problem to build to.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'shapes',
    title: 'The seven signals, in time',
    params: { signal: 'rect', T: 5, t0: 0 },
    view: 'time',
    visible: ['signal', 'T', 't0'],
  },
  {
    id: 'gate',
    title: 'The gate and the cardinal sine',
    params: { signal: 'rect', T: 5, t0: 0 },
    view: 'spectrum',
    visible: ['T', 't0'],
  },
  {
    id: 'scaling',
    title: 'Compress in time, spread in frequency',
    params: { signal: 'rect', T: 15, t0: 0 },
    view: 'spectrum',
    visible: ['T', 't0'],
    lock: true,
  },
  {
    id: 'gauss',
    title: 'The Gaussian, a fixed point of Fourier',
    params: { signal: 'gauss', T: 5, t0: 0 },
    view: 'spectrum',
    visible: ['signal', 'T', 't0'],
  },
  {
    id: 'delay',
    title: 'A delay is only visible in the phase',
    params: { signal: 'rect', T: 5, t0: 0 },
    view: 'phase',
    visible: ['signal', 't0'],
  },
  {
    id: 'sidelobes',
    title: 'Sidelobes, in dB',
    params: { signal: 'rect', T: 5, t0: 0 },
    view: 'db',
    visible: ['signal', 't0'],
  },
  {
    id: 'rf',
    title: 'Modulating is shifting the spectrum',
    params: { signal: 'rf', T: 5, f0: 600, t0: 0 },
    view: 'spectrum',
    visible: ['f0', 'T', 't0'],
  },
];
