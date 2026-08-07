// Lecture script. Auto-discovered by the registry.
const BASE = { N: 64, L: 4, mod: 'qpsk', M: 600, gamma: 5, seed: 34 };

// PLAN — context 1 · problem 2 · method 3-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'waveform',
    title: 'What an OFDM symbol looks like',
    view: 'envelope',
    params: { ...BASE, L: 1 },
    visible: ['N', 'mod'],
  },

  {
    id: 'between-the-samples',
    title: 'The peak is between the samples',
    view: 'envelope',
    params: { ...BASE },
    visible: ['L', 'N'],
  },
  {
    id: 'how-often',
    title: 'How often does it cross?',
    view: 'envelope',
    params: { ...BASE, gamma: 4 },
    visible: ['gamma', 'N'],
  },
  {
    id: 'the-tail',
    title: 'What a designer actually buys',
    view: 'ccdf',
    params: { ...BASE, M: 2000 },
    visible: ['gamma', 'N', 'L'],
  },
];
