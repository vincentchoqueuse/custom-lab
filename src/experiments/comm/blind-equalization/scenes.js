// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'blind',
    title: 'It works, and nothing was taught to it',
    view: 'constellation',
    params: { mod: 'qpsk', h: [1, 0.5, -0.2], phi: 0, snr: 25, L: 11, mu: 0.002, n: 0, seed: 34 },
    visible: ['n', 'mu'],
  },
  {
    id: 'rotation',
    title: 'It converges up to a rotation',
    view: 'constellation',
    params: { mod: 'qpsk', h: [1, 0.5, -0.2], phi: 40, snr: 25, L: 11, mu: 0.002, n: 8000, seed: 34 },
    visible: ['phi', 'n'],
  },
  {
    id: 'qam',
    title: 'What a constant modulus was really buying',
    view: 'constellation',
    params: { mod: '16qam', h: [1, 0.5, -0.2], phi: 0, snr: 30, L: 11, mu: 0.002, n: 8000, seed: 34 },
    visible: ['mod', 'mu'],
  },
  {
    id: 'step',
    title: 'The step size, with nobody to warn you',
    view: 'constellation',
    params: { mod: 'qpsk', h: [1, 0.5, -0.2], phi: 0, snr: 25, L: 11, mu: 0.008, n: 8000, seed: 34 },
    visible: ['mu', 'seed'],
  },
];
