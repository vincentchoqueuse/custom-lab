// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3 · invoice 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
//
// PILLS: the activation rides every scene. Switching tanh → ReLU → sigmoid on
// the SAME problem is the cheapest ablation there is, and ReLU dying on the
// spiral is the xor lesson met again in the wild — the room should never have
// to open the drawer to try it.
export default [
  {
    id: 'one-line',
    title: 'Two blobs, one neuron',
    view: 'plane',
    params: { dataset: 'blobs', hidden: 1, act: 'tanh', lr: 0.4, epoch: 3000, sigma: 0.35 },
    visible: ['dataset', 'hidden', 'act'],
  },
  {
    id: 'ring',
    title: 'No line rings a ring',
    view: 'plane',
    params: { dataset: 'circle', hidden: 1, act: 'tanh', lr: 0.4, epoch: 3000, sigma: 0.2 },
    visible: ['hidden', 'dataset', 'act'],
  },
  {
    id: 'spiral',
    title: 'The spiral, and what width buys',
    view: 'plane',
    params: { dataset: 'spiral', hidden: 8, act: 'tanh', lr: 0.4, epoch: 3000, sigma: 0.2 },
    visible: ['hidden', 'act', 'epoch', 'lr'],
  },
  {
    id: 'memorize',
    title: 'Raise the noise, watch it memorize',
    view: 'learning',
    params: { dataset: 'circle', hidden: 8, act: 'tanh', lr: 0.4, epoch: 3000, sigma: 0.65 },
    visible: ['sigma', 'hidden', 'act', 'epoch'],
  },
];
