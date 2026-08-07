import { float, int, log, select } from '../../../core/fields.js';
import { view, custom, line } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'gradient-descent',
  order: 2,
  title: 'Descent: gradient against Newton',
  subtitle: 'Three algorithms, one landscape — the conditioning decides everything',
  tags: ['optimization', 'gradient', 'Newton', 'momentum', 'conditioning', 'Rosenbrock'],

  doc: `On a round bowl the gradient points at the minimum and the descent is a
straight line — orthogonal to a circular level set means radial, and there
is nothing more to what follows than that sentence failing on an ellipse.
At κ = 10 the path zigzags across the valley instead of running along it;
Newton bends the direction by H⁻¹ and lands in one step, exactly, because
the landscape is quadratic. Momentum smooths the zigzag — at the right β,
((√κ−1)/(√κ+1))², not the 0.9 everybody reaches for: too heavy a ball
rings, swinging wider than the plain gradient.

The convergence view names the rates. The gradient is linear at
((κ−1)/(κ+1))², momentum reaches the square root of that — four orders of
magnitude at sixty iterations for one extra vector in memory — and Newton
is not "fast" but exact, one step to machine precision squared. The step
size has hard edges the experiment lets you find: overshooting past α = 1,
divergence at exactly 2/κ. Newton is not always used because H⁻¹ costs
O(n³) with n in the billions; momentum exists in that gap.

Rosenbrock closes with the everyday reality: a curved valley with a nearly
flat floor, where the gradient crawls with a minute step while Newton
follows the curvature in a handful of iterations. The whole zoo between
the two extremes — BFGS, Adam and the rest — exists for that landscape.`,


  params: {
    fn: select('function', {
      description: 'landscape to minimize',
      options: [
        { value: 'quad', label: 'quadratic' },
        { value: 'rosenbrock', label: 'Rosenbrock' },
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
