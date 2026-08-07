// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2 · problem 3 · method 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'shape',
    title: 'The curve, and its derivative',
    view: 'transfer',
    params: { act: 'relu', signal: 'sine', gain: 1, bias: 0 },
    visible: ['act', 'bias'],
  },
  {
    id: 'harmonics',
    title: 'A nonlinearity creates frequencies',
    view: 'spectrum',
    params: { act: 'relu', signal: 'sine', gain: 1, bias: 0 },
    visible: ['act', 'gain'],
  },
  {
    id: 'imd',
    title: 'Two tones, and the line that cannot be filtered',
    view: 'spectrum',
    params: { act: 'tanh', signal: 'two', gain: 2, bias: 0 },
    visible: ['gain', 'act'],
  },
  {
    id: 'why',
    title: 'Why one is needed at all',
    view: 'time',
    params: { act: 'identity', signal: 'square', gain: 1, bias: 0 },
    visible: ['act', 'bias'],
  },
];
