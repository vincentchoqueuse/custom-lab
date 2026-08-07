// Lecture script. Auto-discovered by the registry.
//
// THE SCRIPT IS THE ROC, because that is what makes this a detection
// experiment rather than a statistics one. Every scene opens on it except the
// two that cannot: the third asks what the model CLAIMS about a probability,
// and the fourth is about the fit itself.
//
// Written to be played straight after "The Neyman–Pearson detector" and "When
// the signal is not known". Those two knew the densities, or knew them up to a
// parameter. This one knows nothing but examples.
const BASE = {
  d: 2.5,
  v: 1,
  N: 200,
  prior: 0.5,
  lam: 1e-12,
  thresh: 0.5,
  k: 25,
  seed: 34,
};

// PLAN — context 1 · problem 2 · method 3-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'bridge',
    title: 'The likelihood ratio, learned instead of derived',
    view: 'roc',
    params: { ...BASE },
    visible: ['N', 'd'],
  },
  {
    id: 'misspecified',
    title: 'v ≠ 1 — the gap that data does not close',
    view: 'roc',
    params: { ...BASE, v: 2.5 },
    visible: ['v', 'N'],
  },
  {
    id: 'threshold',
    title: 'The threshold IS the prior',
    view: 'posterior',
    params: { ...BASE, prior: 0.2, N: 600 },
    visible: ['thresh', 'prior'],
  },
  {
    id: 'separable',
    title: 'When the maximum likelihood does not exist',
    view: 'irls',
    params: { ...BASE, d: 8, N: 30, lam: 1e-12, k: 25 },
    visible: ['k', 'lam', 'N'],
  },
];
