// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3 · invoice 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'families',
    title: 'One specification, four families',
    view: 'gain',
    params: { family: 'butter', fp: 1000, fstop: 2000, Amax: 1, Amin: 40 },
    visible: ['family', 'Amin'],
  },
  {
    id: 'tighten',
    title: 'Tightening the specification',
    view: 'gain',
    params: { family: 'ellip', fp: 1000, fstop: 1400, Amax: 0.5, Amin: 60 },
    visible: ['fstop', 'Amin'],
  },
  {
    id: 'geometry',
    title: 'The geometry of the families',
    view: 'poles',
    params: { family: 'butter', fp: 1000, fstop: 2000, Amax: 1, Amin: 40 },
    visible: ['family', 'fp'],
  },
  {
    id: 'price',
    title: 'What selectivity costs',
    view: 'delay',
    params: { family: 'butter', fp: 1000, fstop: 2000, Amax: 1, Amin: 40 },
    visible: ['family', 'Amin'],
  },
];
