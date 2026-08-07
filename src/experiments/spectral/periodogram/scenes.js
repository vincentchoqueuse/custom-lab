// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3-4 · problem 5 · method 6 · wall 7
// The last scene hands the record over to "High-resolution methods" unchanged:
// same 200 Hz, same 2 Hz gap, same 25 dB, same 256 samples (RUNNING THREAD).
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'one-line',
    title: 'One line, and no argument about where it is',
    view: 'spectrum',
    params: { method: 'raw', N: 512, L: 256, win: 'rect', snr: 40, a2: -20, df: 40 },
    visible: ['snr', 'N'],
  },

  {
    id: 'noise-floor',
    title: 'The noise floor that never comes down',
    // the SPECTRAL figure, which is what these notes describe and what the
    // subject is about; the record itself is one tab to the left, for the room
    // that wants to see what was measured before seeing what was estimated
    view: 'spectrum',
    params: { method: 'raw', N: 512, L: 256, win: 'rect', snr: 10, a2: -20, df: 40 },
    visible: ['N', 'snr'],
  },
  {
    id: 'cutting',
    title: 'Where the samples go',
    view: 'segments',
    params: { method: 'bartlett', N: 4096, L: 256, win: 'rect', snr: 10, a2: -20, df: 40 },
    visible: ['method', 'win'],
  },
  {
    id: 'welch',
    title: 'Averaging, and paying in resolution',
    view: 'spectrum',
    params: { method: 'welch', N: 2048, L: 256, win: 'hann', snr: 10, a2: -20, df: 40 },
    visible: ['method', 'L'],
  },
  {
    id: 'buried',
    title: 'Two ways to lose a line',
    view: 'spectrum',
    params: { method: 'welch', N: 4096, L: 512, win: 'rect', snr: 10, a2: -35, df: 12 },
    visible: ['win', 'a2', 'df'],
  },
  {
    id: 'law',
    title: 'The −1/2 slope',
    view: 'consistency',
    params: { method: 'welch', N: 4096, L: 256, win: 'hann', snr: 10, a2: -20, df: 40 },
    visible: ['method', 'N'],
  },
  {
    id: 'handover',
    title: 'Two lines that will not come apart',
    view: 'spectrum',
    params: { method: 'raw', N: 256, L: 128, win: 'rect', snr: 25, a2: 0, df: 2 },
    visible: ['df', 'N'],
  },
];
