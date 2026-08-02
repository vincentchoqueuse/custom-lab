import { float, int, log, select } from '../../../core/fields.js';
import { view, custom, line } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'gradient-descent',
  title: 'La descente : gradient contre Newton',
  subtitle: 'Trois algorithmes, un paysage — le conditionnement décide de tout',
  tags: ['optimisation', 'gradient', 'Newton', 'momentum', 'conditionnement', 'Rosenbrock'],

  params: {
    fn: select('fonction', {
      description: 'paysage à minimiser',
      options: [
        { value: 'quad', label: 'quadratique conditionnée κ' },
        { value: 'rosenbrock', label: 'Rosenbrock (la banane)' },
      ],
      default: 'quad',
    }),
    kappa: log('κ', {
      description: 'conditionnement de la quadratique',
      min: 1,
      max: 100,
      default: 10,
      visibleIf: { fn: 'quad' },
    }),
    alpha: log('α', { description: 'pas du gradient (et du momentum)', min: 1e-4, max: 2, default: 0.1 }),
    beta: float('β', { description: 'inertie du momentum', min: 0, max: 0.99, step: 0.01, default: 0.9, precision: 2 }),
    N: int('N', { description: 'nombre d\'itérations', min: 1, max: 100, default: 30 }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    stab: {
      label: 'stabilité du gradient : α < 2/κ',
      calc: (p) => (p.fn === 'quad' ? `2/κ = ${(2 / p.kappa).toFixed(3)}` : '—'),
    },
    rate: {
      label: 'taux optimal ((κ−1)/(κ+1))²',
      calc: (p) => (p.fn === 'quad' ? (((p.kappa - 1) / (p.kappa + 1)) ** 2).toFixed(3) : '—'),
    },
  },

  groups: [
    { title: 'Paysage', params: ['fn', 'kappa'] },
    { title: 'Algorithmes', params: ['alpha', 'beta', 'N'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // CUSTOM view: iso-contours + the three iterate trajectories, equal aspect.
    custom('landscape', 'Lignes de niveau', () => import('./views/ContourDescent.svelte')),

    // semi-log convergence: straight line = linear rate, cliff = Newton
    view(
      'convergence',
      'Convergence',
      line('gapGradient', {
        width: 2.2,
        label: 'gradient',
        overlays: [
          line('gapMomentum', { color: '#77AC30', width: 2.2, label: 'momentum' }),
          line('gapNewton', { color: '#D95319', width: 2.2, label: 'Newton' }),
        ],
        axes: { x: 'itération k', y: { label: 'f(xₖ) − f*', scale: 'log' } },
      })
    ),
  ],
};
