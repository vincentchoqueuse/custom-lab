// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2 · problem 3-5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'through',
    title: 'The signal goes in, the signal comes out',
    view: 'response',
    params: { method: 'bilinear', family: 'butter', n: 4, fc: 1000, Amax: 1,
              source: 'square', f0: 200 },
    visible: ['fc', 'n'],
  },
  {
    id: 'match',
    title: 'The prototype goes digital',
    view: 'response',
    params: { method: 'bilinear', family: 'butter', n: 4, fc: 1000, Amax: 1 },
    visible: ['family', 'n'],
  },
  {
    id: 'warping',
    title: 'Forgetting the pre-warping',
    view: 'response',
    params: { method: 'naive', family: 'butter', n: 4, fc: 1000, Amax: 1 },
    visible: ['method', 'fc'],
  },
  {
    id: 'zplane',
    title: 'The left half-plane wraps around',
    view: 'poles',
    params: { method: 'bilinear', family: 'butter', n: 6, fc: 1000, Amax: 1 },
    visible: ['n', 'fc'],
  },
  {
    id: 'aliasing',
    title: 'Impulse invariance and its aliasing',
    view: 'response',
    params: { method: 'impulse', family: 'butter', n: 2, fc: 1000, Amax: 1 },
    visible: ['method', 'n'],
  },
];
