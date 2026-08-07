// Lecture script. Auto-discovered by the registry.
const BASE = { bits: 1, order: 1, osr: 64, amp: 0.4, fin: 0.4 };

// PLAN — context 1 · method 2-3 · invoice 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'one-bit',
    title: 'One comparator, and a sine comes back out',
    view: 'time',
    params: { ...BASE },
    visible: ['bits', 'osr'],
  },
  {
    id: 'where',
    title: 'Where the noise went',
    view: 'spectrum',
    params: { ...BASE },
    visible: ['order', 'osr'],
  },
  {
    id: 'law',
    title: 'Nine decibels per octave, and fifteen',
    view: 'sqnr',
    params: { ...BASE, order: 1 },
    visible: ['order', 'bits'],
  },
  {
    id: 'invoice',
    title: 'The invoice: shaping moves noise, it does not remove it',
    view: 'spectrum',
    params: { ...BASE, bits: 4, order: 2, osr: 32 },
    visible: ['order', 'bits'],
  },
];
