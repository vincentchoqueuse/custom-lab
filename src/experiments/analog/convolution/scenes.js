// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-6
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'slide',
    title: 'Flip, slide, integrate',
    params: { sig: 'gate', ker: 'gate', a: 1, b: 1, t: 0.4 },
    view: 'overlap',
    visible: ['sig', 'ker', 't'],
  },
  {
    id: 'triangle',
    title: 'Two gates give a TRIANGLE',
    params: { sig: 'gate', ker: 'gate', a: 1, b: 1, t: 1 },
    view: 'response',
    visible: ['sig', 'ker', 't'],
  },
  {
    id: 'widths',
    title: 'Widths add, areas multiply',
    params: { sig: 'gate', ker: 'gate', a: 2, b: 0.5, t: 1 },
    view: 'response',
    visible: ['sig', 'ker', 'a', 'b'],
    lock: true,
  },
  {
    id: 'commute',
    title: 'Which one gets flipped? (it makes no difference)',
    params: { sig: 'gate', ker: 'gate', a: 2, b: 0.5, t: 1 },
    view: 'overlap',
    visible: ['sig', 'ker', 'a', 'b'],
  },
  {
    id: 'rc',
    title: 'The same integral is the charging of an RC',
    params: { sig: 'gate', ker: 'exp', a: 1.5, b: 0.4, t: 1 },
    view: 'response',
    visible: ['sig', 'ker', 't', 'b'],
  },
  {
    id: 'theorem',
    title: 'The same operation is a MULTIPLICATION',
    params: { sig: 'gate', ker: 'exp', a: 1.5, b: 0.4, t: 1 },
    view: 'spectrum',
    visible: ['ker', 'a', 'b'],
  },
];
