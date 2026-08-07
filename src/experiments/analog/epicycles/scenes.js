// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2 · problem 3 · method 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
//
// PILLS are uniform on purpose: [τ, K, …] rides every scene, because τ is the
// animation (where the pen is on its lap) and K the budget — the two dials a
// hand reaches for whatever the story of the moment. The scene's own subject
// takes the remaining slot. The opener draws the SQUARE, not the heart: the
// square is the sober canonical Fourier example (odd harmonics, 1/k² decay),
// and the heart keeps its place in the shape picker for the room to discover.
export default [
  {
    id: 'machine',
    title: 'A chain of circles draws a square',
    view: 'epicycles',
    params: { shape: 'square', K: 8, tau: 0.35, sort: 'mag' },
    visible: ['tau', 'K', 'shape'],
  },
  {
    id: 'exact',
    title: 'The star is exactly three circles',
    view: 'epicycles',
    params: { shape: 'star', K: 3, tau: 0.6, sort: 'mag' },
    visible: ['tau', 'K', 'shape'],
  },
  {
    id: 'corners',
    title: 'Corners cost circles',
    view: 'spectrum',
    params: { shape: 'square', K: 6, tau: 0.35, sort: 'mag' },
    visible: ['K', 'tau', 'shape'],
  },
  {
    id: 'budget',
    title: 'Same budget, different circles',
    view: 'epicycles',
    params: { shape: 'heart', K: 3, tau: 1, sort: 'freq' },
    visible: ['sort', 'tau', 'K'],
  },
];
