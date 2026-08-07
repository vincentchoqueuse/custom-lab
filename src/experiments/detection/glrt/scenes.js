// Lecture script. Auto-discovered by the registry.
//
// Written to be played straight after "The Neyman–Pearson detector": same σ,
// same convention for the SNR, same three tabs in the same order. What changes
// is what the receiver is allowed to know.
const BASE = { snr: 0.1, N: 20, pfa: 0.01, detector: 'glrt', R: 16, M: 4000, seed: 34 };

// PLAN — problem 1-3 · method 4. NO CONTEXT SCENE, deliberately: the fully known
// case is the experiment next door, and this one opens on what it costs to
// lose each piece of it.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'amplitude',
    title: 'Not knowing the amplitude',
    view: 'densities',
    params: { ...BASE, detector: 'matched' },
    visible: ['detector', 'snr'],
  },
  {
    id: 'signal',
    title: 'Not knowing the signal at all',
    view: 'pd-vs-snr',
    params: { ...BASE, detector: 'energy' },
    visible: ['detector', 'N'],
  },
  {
    id: 'cfar',
    title: 'Not knowing the noise either',
    view: 'densities',
    params: { ...BASE, detector: 'cfar', R: 4 },
    visible: ['R', 'detector'],
  },
  {
    id: 'roc',
    title: 'The four of them on one ROC',
    view: 'roc',
    params: { ...BASE, detector: 'energy', snr: 0.25 },
    visible: ['detector', 'pfa'],
  },
];
