// Lecture script. Auto-discovered by the registry.
// PLAN — ATLAS: three transforms visited in turn, not one argument in three beats.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'shift',
    title: 'Shifting: b (a = 1)',
    params: { law: 'gaussian', a: 1, b: 2 },
    visible: ['a', 'b', 'law'],
  },
  {
    id: 'stretch',
    title: 'Stretching: a (b = 0)',
    params: { law: 'gaussian', a: 2, b: 0 },
    visible: ['a', 'b'],
  },
  {
    id: 'flip',
    title: 'Flipping: a < 0',
    params: { law: 'exponential', a: -1, b: 0 },
    visible: ['a', 'b', 'law'],
  },
];
