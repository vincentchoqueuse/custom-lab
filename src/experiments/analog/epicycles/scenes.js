// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2 · problem 3 · method 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'machine',
    title: 'Eight circles draw a heart',
    view: 'epicycles',
    params: { shape: 'heart', K: 8, tau: 0.35, sort: 'mag' },
    visible: ['tau', 'K'],
  },
  {
    id: 'exact',
    title: 'The star is exactly three circles',
    view: 'epicycles',
    params: { shape: 'star', K: 3, tau: 0.6, sort: 'mag' },
    visible: ['shape', 'K'],
  },
  {
    id: 'corners',
    title: 'Corners cost circles',
    view: 'spectrum',
    params: { shape: 'square', K: 6, tau: 0.35, sort: 'mag' },
    visible: ['K', 'shape'],
  },
  {
    id: 'budget',
    title: 'Same budget, different circles',
    view: 'epicycles',
    params: { shape: 'heart', K: 3, tau: 1, sort: 'freq' },
    visible: ['sort', 'K'],
  },
];
