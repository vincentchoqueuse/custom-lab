// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'plain',
    title: 'A pulse you can simply see',
    view: 'signals',
    params: { shape: 'rect', N: 32, snr: 3, tau: 32, M: 800 },
    visible: ['snr', 'shape'],
  },

  {
    id: 'invisible',
    title: 'Where is the pulse?',
    view: 'signals',
    params: { shape: 'rect', N: 32, snr: 0.1, tau: 32, M: 800 },
    visible: ['snr', 'N'],
  },
  {
    id: 'peak',
    title: 'The peak rises out of the noise',
    params: { shape: 'rect', N: 32, snr: 0.1, tau: 32, M: 800 },
    view: 'correlator',
    visible: ['snr', 'tau'],
  },
  {
    id: 'gain',
    title: '+3 dB per doubling',
    params: { shape: 'rect', N: 32, snr: 0.2, tau: 32, M: 2000 },
    view: 'processing',
    visible: ['N', 'shape'],
  },
];
