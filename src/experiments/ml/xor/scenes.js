// Lecture script — auto-discovered by the registry.
// PLAN — problem 1 · method 2 · problem 3-4. NO CONTEXT SCENE, deliberately: the
// 1969 counter-example IS the opening.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'perceptron',
    title: 'A straight line cannot do it',
    view: 'plane',
    params: { problem: 'xor', hidden: 1, act: 'identity', lr: 0.5, epoch: 4000 },
    visible: ['problem', 'hidden'],
  },
  {
    id: 'two',
    title: 'Two neurons settle it',
    view: 'plane',
    params: { problem: 'xor', hidden: 2, act: 'tanh', lr: 0.5, epoch: 4000 },
    visible: ['hidden', 'epoch'],
  },
  {
    id: 'plateau',
    title: 'The plateau, and why it frightens people',
    view: 'learning',
    params: { problem: 'xor', hidden: 2, act: 'tanh', lr: 0.15, epoch: 4000 },
    visible: ['lr', 'epoch'],
  },
  {
    id: 'seed',
    title: 'The initial randomness decides',
    view: 'learning',
    params: { problem: 'xor', hidden: 2, act: 'tanh', lr: 0.5, epoch: 4000 },
    visible: ['hidden', 'act'],
  },
];
