// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · method 2-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'step',
    title: 'Type in your system',
    view: 'response',
    params: { num: [1], den: [1, 2, 1], input: 'step' },
    visible: ['num', 'den', 'input'],
  },
  {
    id: 'ramp',
    title: 'The ramp measures the lag',
    view: 'response',
    params: { num: [1], den: [1, 2, 1], input: 'ramp' },
    visible: ['den', 'num'],
  },
  {
    id: 'sine',
    title: 'The living definition of H(jω)',
    view: 'response',
    params: { num: [1], den: [1, 2, 1], input: 'sine', f: 0.5 },
    visible: ['input', 'f'],
  },
  {
    id: 'poles',
    title: 'The poles decide, time obeys',
    params: { num: [1], den: [1, 2, 1], input: 'step' },
    view: 'poles',
    visible: ['den', 'input'],
  },
];
