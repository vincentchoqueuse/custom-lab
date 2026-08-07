// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2-3 · method 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'fine-grid',
    title: 'A fine grid finds everything',
    params: { f: 5, sigma: 0.3, step: 0.05 },
    view: 'time',
    visible: ['step', 'sigma'],
  },
  {
    id: 'step-too-large',
    title: 'The step that steps over the basin',
    params: { f: 5, sigma: 0.3, step: 1.3 },
    view: 'cost',
    visible: ['step', 'sigma'],
  },
  {
    id: 'quantization',
    title: 'Without noise, the error remains',
    params: { f: 5, sigma: 0, step: 0.4 },
    view: 'cost',
    visible: ['step', 'sigma'],
  },
  {
    id: 'reconstructed',
    title: 'The reconstructed signal',
    params: { f: 5, sigma: 0.5, step: 0.05 },
    view: 'time',
    visible: ['sigma', 'f'],
  },
];
