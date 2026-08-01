import { float, int } from '../../../core/fields.js';
import { view, line, scatter, bars, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'polynomial-regression',
  title: 'Régression polynomiale',
  subtitle: 'Moindres carrés : ajustement, sous- et sur-ajustement',
  tags: ['moindres carrés', 'régression', 'polynôme', 'overfitting'],

  params: {
    a0: float('a₀', { description: 'coefficient constant', min: -2, max: 2, step: 0.1, default: 0.5 }),
    a1: float('a₁', { description: 'coefficient en x', min: -2, max: 2, step: 0.1, default: -1 }),
    a2: float('a₂', { description: 'coefficient en x²', min: -2, max: 2, step: 0.1, default: -0.5 }),
    a3: float('a₃', { description: 'coefficient en x³', min: -2, max: 2, step: 0.1, default: 2 }),
    d: int('d', { description: 'ordre du polynôme estimé', min: 0, max: 9, default: 3 }),
    N: int('N', { description: 'nombre de points', min: 5, max: 200, default: 30 }),
    sigma: float('σ', { description: 'écart-type du bruit', min: 0, max: 2, step: 0.05, default: 0.3 }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (p) => p.d + 1 > p.N, message: 'Il faut N ≥ d+1 points pour estimer d+1 coefficients' },
  ],

  derived: {
    dof: { label: 'N − (d+1)', calc: (p) => p.N - (p.d + 1) },
  },

  groups: [
    { title: 'Polynôme vrai (degré 3)', params: ['a0', 'a1', 'a2', 'a3'] },
    { title: 'Données', params: ['N', 'sigma'] },
    { title: 'Modèle estimé', params: ['d'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // Declarative only — true curve, noisy data, fitted curve.
    view(
      'fit',
      'Ajustement',
      line('trueCurve', {
        width: 2.5,
        overlays: [
          scatter('noisyPoints', { color: '#7E2F8E', size: 3.5, opacity: 0.6 }),
          line('fittedCurve', { color: '#D95319', width: 2.5, dashed: true }),
        ],
        axes: { x: 'x', y: 'y' },
      })
    ),

    // Estimated coefficients (bars) against the true ones (dots).
    view(
      'coefficients',
      'Coefficients',
      bars('coeffsHat', {
        color: '#D95319',
        opacity: 0.75,
        overlays: [
          hline(() => 0, { color: '#a1a1aa', width: 1 }),
          scatter('coeffsTrue', { color: '#0072BD', size: 5 }),
        ],
        axes: { x: 'k (degré)', y: 'aₖ' },
      })
    ),
  ],
};
