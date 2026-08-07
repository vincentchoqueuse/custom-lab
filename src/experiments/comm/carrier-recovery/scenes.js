// Lecture script. Auto-discovered by the registry.
const BASE = {
  mod: 'qpsk', ebn0Db: 12, phi0: 35, dfreq: 0,
  algo: 'costas', blt: 0.005, zeta: 0.707, order: 2, block: 64, N: 6000, seed: 34,
};

// PLAN — context 1 · problem 2-3 · method 4-5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'locked',
    title: 'A constellation that stands still',
    view: 'constellation',
    params: { ...BASE },
    visible: ['mod', 'ebn0Db'],
  },

  {
    id: 'turning',
    title: 'The constellation is turning',
    view: 'constellation',
    params: { ...BASE, dfreq: 0.3, algo: 'costas' },
    visible: ['dfreq', 'phi0'],
  },
  {
    id: 'ambiguity',
    title: 'The ambiguity no loop can lift',
    view: 'scurve',
    params: { ...BASE, mod: 'qpsk' },
    visible: ['mod', 'algo'],
  },
  {
    id: 'order',
    title: 'A ramp needs an integrator',
    view: 'tracking',
    params: { ...BASE, ebn0Db: 25, dfreq: 0.4, blt: 0.003, order: 1 },
    visible: ['order', 'dfreq'],
  },
  {
    id: 'jitter',
    title: 'How wide should the loop be?',
    view: 'jitter',
    params: { ...BASE, ebn0Db: 12, algo: 'costas', order: 2 },
    visible: ['blt', 'ebn0Db'],
  },
];
