// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2-3 · method 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'two-poles',
    title: 'Two poles walk toward each other',
    view: 'locus',
    params: { sys: 'double', K: 0.3, z: 2 },
    visible: ['K', 'sys'],
  },
  {
    id: 'third-pole',
    title: 'A third pole bends the road right',
    view: 'locus',
    params: { sys: 'triple', K: 1, z: 2 },
    visible: ['K', 'sys'],
  },
  {
    id: 'in-time',
    title: 'The same countdown, in time',
    view: 'step',
    params: { sys: 'triple', K: 2, z: 2 },
    visible: ['K', 'sys'],
  },
  {
    id: 'zero-rescues',
    title: 'A zero bends it back — if placed well',
    view: 'locus',
    params: { sys: 'zero', K: 10, z: 2 },
    visible: ['z', 'K'],
  },
];
