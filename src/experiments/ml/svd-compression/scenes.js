// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'phantom',
    title: 'An image is a matrix',
    view: 'images',
    params: { image: 'phantom', k: 3 },
    visible: ['image', 'k'],
  },
  {
    id: 'spectrum',
    title: 'What decides is the spectrum',
    view: 'singular',
    params: { image: 'phantom', k: 12 },
    visible: ['image', 'k'],
  },
  {
    id: 'exact',
    title: 'The error is known in advance',
    view: 'energy',
    params: { image: 'phantom', k: 12 },
    visible: ['k', 'image'],
  },
];
