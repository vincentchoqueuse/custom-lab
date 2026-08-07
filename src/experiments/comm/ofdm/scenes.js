// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2 · problem 3 · method 4 · problem 5-6
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'symbols',
    title: 'What went on each carrier, and what came back',
    view: 'symbols',
    params: { Nc: 64, L: 6, cp: 8, snr: 25, M: 50, k: 20 },
    visible: ['k', 'L'],
  },
  {
    id: 'absorb',
    title: 'The prefix absorbs the channel',
    view: 'time',
    params: { Nc: 64, L: 6, cp: 8, snr: 25, M: 50, seed: 5 },
    visible: ['cp', 'L'],
  },
  {
    id: 'selective',
    title: 'The channel digs holes',
    // Declared, and it has to be: the two time views now come first, so a scene
    // that says "look at the channel" would otherwise open on the waveform.
    view: 'channel',
    params: { Nc: 64, L: 6, cp: 8, snr: 15, M: 150, k: 23 },
    visible: ['k', 'L'],
  },
  {
    id: 'one-tap',
    title: 'The miracle of the FFT',
    view: 'constellation',
    params: { Nc: 64, L: 6, cp: 8, snr: 20, M: 150, k: 23 },
    visible: ['k', 'snr'],
  },
  {
    id: 'prefix',
    title: 'Sabotaging the prefix',
    view: 'constellation',
    params: { Nc: 64, L: 6, cp: 8, snr: 25, M: 50, seed: 5 },
    visible: ['cp', 'k'],
  },
  {
    id: 'fades',
    title: 'The errors live in the holes',
    view: 'ber',
    params: { Nc: 64, L: 6, cp: 8, snr: 12, M: 200, k: 55 },
    visible: ['k', 'snr'],
  },
];
