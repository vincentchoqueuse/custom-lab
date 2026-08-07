// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-3 · problem 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'samples',
    title: 'What we have: samples',
    params: { stage: 'samples', L: 4, f0: 1000, half: 8 },
    visible: ['stage', 'f0'],
  },
  {
    id: 'stuffing',
    title: 'Zeros — and the spectrum does not move',
    params: { stage: 'stuffed', L: 4, f0: 1000, half: 8 },
    visible: ['L', 'stage'],
  },
  {
    id: 'filter',
    title: 'The filter erases the images',
    params: { stage: 'filtered', L: 4, f0: 1000, half: 8 },
    visible: ['stage', 'L'],
  },
  {
    id: 'short',
    title: 'A filter that is too short',
    params: { stage: 'filtered', L: 4, f0: 1000, half: 1 },
    visible: ['half', 'L'],
  },
];
