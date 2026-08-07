// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3-5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'harmonics',
    title: 'A square wave, harmonic by harmonic',
    view: 'time',
    params: { wave: 'square', N: 1, A: 1 },
    visible: ['N', 'wave'],
  },
  {
    id: 'gibbs',
    title: 'The Gibbs phenomenon',
    view: 'time',
    params: { wave: 'square', N: 10, A: 1 },
    visible: ['N', 'wave'],
    lock: true,
  },
  {
    id: 'continuity',
    title: 'Continuity sets the rate',
    view: 'time',
    params: { wave: 'triangle', N: 3, A: 1 },
    visible: ['wave', 'N'],
  },
  {
    id: 'pulse',
    title: 'The pulse train and its sinc envelope',
    params: { wave: 'pulse', N: 40, A: 1, alpha: 0.25 },
    view: 'spectrum',
    visible: ['alpha', 'wave'],
    lock: true,
  },
  {
    id: 'duty-half',
    title: 'α = 1/2: the square wave returns',
    params: { wave: 'pulse', N: 40, A: 1, alpha: 0.5 },
    view: 'spectrum',
    visible: ['alpha', 'wave'],
  },
];
