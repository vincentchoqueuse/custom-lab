// Lecture script. Auto-discovered by the registry.
const BASE = { mod: 'qpsk', mapping: 'gray', ebn0Db: 8, N: 3000, seed: 34 };

// PLAN — context 1-2 · method 3-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'baseband',
    title: 'What actually travels: two signals',
    view: 'time',
    params: { ...BASE },
    visible: ['mod', 'ebn0Db'],
  },
  {
    id: 'qpsk',
    title: 'QPSK, comfortable',
    view: 'iq',
    params: { ...BASE, ebn0Db: 10 },
    visible: ['mod', 'ebn0Db'],
  },
  {
    id: 'gray',
    title: 'Gray against natural binary',
    view: 'iq',
    params: { ...BASE, mod: '16qam', ebn0Db: 10 },
    visible: ['mapping', 'mod'],
  },
  {
    id: 'waterfall',
    title: 'Symbols, bits, and the honest axis',
    view: 'waterfall',
    params: { ...BASE, mod: '16qam' },
    visible: ['mod', 'mapping'],
  },
];
