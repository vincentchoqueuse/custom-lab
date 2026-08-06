import { float, int, log, select } from '../../../core/fields.js';
import { view, custom, line } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'gradient-descent',
  order: 2,
  title: 'Descent: gradient against Newton',
  subtitle: 'Three algorithms, one landscape — the conditioning decides everything',
  tags: ['optimization', 'gradient', 'Newton', 'momentum', 'conditioning', 'Rosenbrock'],

  params: {
    fn: select('function', {
      description: 'landscape to minimize',
      options: [
        { value: 'quad', label: 'quadratic' },
        { value: 'rosenbrock', label: 'Rosenbrock (the banana)' },
      ],
      default: 'quad',
    }),
    kappa: log('κ', {
      description: 'conditioning of the quadratic',
      min: 1,
      max: 100,
      default: 10,
      visibleIf: { fn: 'quad' },
    }),
    alpha: log('α', { description: 'step size of gradient (and momentum)', min: 1e-4, max: 2, default: 0.1 }),
    // 0.27 and not 0.9: on a quadratic of conditioning κ the heavy ball is
    // tuned, not turned up. β = ((√κ−1)/(√κ+1))² is 0.27 at the default κ = 10,
    // and at 0.9 the method is so underdamped that it converges FOUR orders of
    // magnitude worse than the plain gradient it is supposed to improve on —
    // which is what the figure showed while the notes said the opposite.
    beta: float('β', { description: 'momentum inertia', min: 0, max: 0.99, step: 0.01, default: 0.27, precision: 2 }),
    N: int('N', { description: 'number of iterations', min: 1, max: 100, default: 30 }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    stab: {
      label: 'gradient stability: α < 2/κ',
      calc: (p) => (p.fn === 'quad' ? `2/κ = ${(2 / p.kappa).toFixed(3)}` : '—'),
    },
    rate: {
      label: 'optimal rate ((κ−1)/(κ+1))²',
      calc: (p) => (p.fn === 'quad' ? (((p.kappa - 1) / (p.kappa + 1)) ** 2).toFixed(3) : '—'),
    },
    // the dial the room needs next, and the reason momentum is not "more is
    // better": past this value the heavy ball rings instead of damping
    betaOpt: {
      label: 'optimal β = ((√κ−1)/(√κ+1))²',
      calc: (p) =>
        p.fn === 'quad'
          ? (((Math.sqrt(p.kappa) - 1) / (Math.sqrt(p.kappa) + 1)) ** 2).toFixed(3)
          : '—',
    },
  },

  groups: [
    { title: 'Landscape', params: ['fn', 'kappa'] },
    { title: 'Algorithms', params: ['alpha', 'beta', 'N'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // CUSTOM view: iso-contours + the three iterate trajectories, equal aspect.
    custom('landscape', 'Level curves', () => import('./views/ContourDescent.svelte')),

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
        axes: { x: 'iteration k', y: { label: 'f(xₖ) − f*', scale: 'log' } },
      })
    ),
  ],
};
