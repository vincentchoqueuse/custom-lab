import { float } from '../../../core/fields.js';
import { view, line, scatter, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'frequency-estimation',
  title: 'Estimation de fréquence (moindres carrés)',
  subtitle: 'Un critère non convexe : grille, gradient et Newton face aux minima locaux',
  tags: ['moindres carrés', 'fréquence', 'optimisation', 'gradient', 'Newton'],

  params: {
    f: float('f', {
      description: 'fréquence vraie',
      min: 1, max: 18, step: 0.1, default: 5, unit: 'Hz', precision: 1,
    }),
    A: float('A', { description: 'amplitude (connue)', min: 0.2, max: 2, step: 0.05, default: 1 }),
    phi: float('φ', {
      description: 'phase (connue)',
      min: -3.14, max: 3.14, step: 0.01, default: 0, unit: 'rad', precision: 2,
    }),
    sigma: float('σ', { description: 'écart-type du bruit', min: 0, max: 2, step: 0.05, default: 0.3 }),
    f0: float('f₀', {
      description: 'initialisation des algorithmes itératifs',
      min: 1, max: 18, step: 0.1, default: 5.2, unit: 'Hz', precision: 1,
    }),
    // no seed here: injected by the core
  },

  derived: {
    lobe: { label: 'largeur du bassin ≈ 1/T', calc: () => '1.0 Hz' },
  },

  groups: [
    { title: 'Signal (T = 1 s, Fs = 100 Hz)', params: ['f', 'A', 'phi', 'sigma'] },
    { title: 'Optimisation', params: ['f0'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    view(
      'signal',
      'Temporel',
      line('trueSignal', {
        width: 2,
        label: 'vrai',
        overlays: [
          scatter('noisySamples', { color: '#7E2F8E', size: 3, opacity: 0.5, label: 'observations' }),
          line('fittedSignal', { color: '#D95319', width: 2, dashed: true, label: 'estimé (grille)' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),

    // The star view: the least-squares cost over frequency, with each
    // algorithm's iterates sitting ON the curve.
    view(
      'cost',
      'Critère J(f)',
      line('costCurve', {
        width: 2,
        label: 'J(f)',
        overlays: [
          scatter('gradPath', { color: '#7E2F8E', size: 3.5, opacity: 0.85, label: 'itérés gradient' }),
          scatter('newtonPath', { color: '#EDB120', size: 3.5, opacity: 0.95, label: 'itérés Newton' }),
          vline('f', { color: '#0072BD', dashed: true, width: 1.4 }),
          vline('fGrid', { color: '#77AC30', width: 1.6, label: 'f̂ grille' }),
          vline('f0', { color: '#a1a1aa', dashed: true, width: 1.4, label: 'f₀' }),
        ],
        axes: { x: { label: 'f', unit: 'Hz' }, y: 'J(f)' },
      })
    ),
  ],
};
