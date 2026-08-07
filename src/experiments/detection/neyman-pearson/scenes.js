// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · method 2-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'threshold',
    title: 'The threshold trade-off',
    view: 'densities',
    params: { snr: 1, pfa: 0.05, N: 10 },
    visible: ['pfa', 'snr'],
  },
  {
    id: 'roc',
    title: 'The ROC curve',
    params: { snr: 1, pfa: 0.05, N: 10, M: 10000 },
    view: 'roc',
    visible: ['snr', 'N'],
  },
  {
    id: 'integration',
    title: 'Integrating helps: P_D vs SNR',
    params: { snr: 0.5, pfa: 0.01, N: 10 },
    view: 'pd-vs-snr',
    visible: ['N', 'pfa'],
  },
  {
    id: 'rare',
    title: 'Rare false alarms (P_FA = 10⁻³)',
    params: { snr: 2, pfa: 1e-3, N: 10, M: 20000 },
    view: 'roc',
    visible: ['pfa', 'M'],
  },
];
