// Lecture script. Auto-discovered by the registry.
//
// THE SCRIPT IS THE SPECTRUM, and the three roads to it. The subject is
// spectral analysis, so the figure a scene opens on is the SPECTRUM unless it
// has a reason not to be — the periodogram first, because that is the picture
// every other method in the subject is trying to improve on, then the two
// families of answer: the greedy pursuits, MP and OMP, and the convex one, the
// lasso. The last two scenes are the invoice.
//
// The spine of this script is the experiment next door. `subspace` postulates
// "d lines in white noise" and is HANDED d; this one is given the same signal,
// the same window and the same decibels, and is not told how many lines there
// are. Every scene is written to be played right after that one.
const BASE = {
  sources: 2,
  df: 1.5,
  snr: 25,
  N: 256,
  over: 2,
  offGrid: 0,
  zoom: 'full',
  algo: 'omp',
  k: 2,
  lam: 0.1,
  alpha: 1,
  seed: 34,
};

// PLAN — context+problem 1 · method 2-3 · invoice 4-5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'periodogram',
    title: 'The periodogram, and what it does not say',
    view: 'spectrum',
    params: { ...BASE, k: 0 },
    visible: ['snr', 'df'],
  },
  {
    id: 'greedy',
    title: 'The greedy road: MP, then OMP',
    view: 'spectrum',
    params: { ...BASE, algo: 'mp', k: 1 },
    visible: ['algo', 'k'],
  },
  {
    id: 'lasso',
    title: 'The convex road: a penalty instead of a count',
    view: 'spectrum',
    params: { ...BASE, algo: 'lasso', lam: 0.4 },
    visible: ['algo', 'lam'],
  },
  {
    id: 'resolution',
    title: 'Δf = 0.5 — where MUSIC wins and this does not',
    view: 'spectrum',
    params: { ...BASE, df: 0.5, k: 2, zoom: 'lines' },
    visible: ['zoom', 'df', 'over'],
  },
  {
    id: 'offgrid',
    title: 'Off the grid, nothing is sparse',
    view: 'spectrum',
    params: { ...BASE, k: 2, snr: 40 },
    visible: ['offGrid', 'k'],
  },
];
