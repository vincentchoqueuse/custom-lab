import { float, log, select } from '../../../core/fields.js';
import { view, line, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'runge-kutta',
  order: 1,
  title: 'Euler, RK2, RK4: order has a price',
  subtitle: 'Integrating a differential equation — the slope of the error is the order',
  tags: ['Runge–Kutta', 'Euler', 'ODE', 'order', 'pendulum', 'simulation'],

  doc: `At a small enough step the choice of integrator does not matter: all three
draw the pendulum a physicist would draw, and the energy — which this
system conserves exactly — stays flat. The interesting part starts when h
grows. Euler adds energy at every step, exponentially, until the pendulum
goes over the top and swings become rotation: the simulation changed the
NATURE of the motion, not merely its accuracy, and the fault is
structural — every Euler step leaves along the tangent, on the outside of
a convex orbit.

The order view measures what an integrator is: dividing h by ten buys a
factor of ten for Euler, a hundred for RK2, ten thousand for RK4 — slopes
1, 2 and 4. The honest comparison is at equal cost, RK4 paying four
evaluations per step, and even so RK4 at h = 0.16 beats Euler at h = 0.005
with eight times less arithmetic. One intelligent step is worth a thousand
naive ones, which is why RK4/5 runs inside scipy and LTspice.

The damped second order ties the subject to the control chapter: at large
h Euler distorts the pseudo-period, then turns a stable system unstable —
the worst failure available, a simulation lying about stability itself.
When no closed form exists, the integrator is all there is, and its order
decides whether the answer means anything.`,


  params: {
    system: select('system', {
      description: 'differential equation integrated',
      options: [
        { value: 'pendulum', label: 'nonlinear pendulum' },
        { value: 'linear', label: 'damped second order' },
      ],
      default: 'pendulum',
    }),
    h: log('h', { description: 'integration step', min: 0.005, max: 0.4, default: 0.1, unit: 's' }),
    theta0: float('θ₀', {
      description: 'initial amplitude of the pendulum',
      min: 0.1,
      max: 3,
      step: 0.05,
      default: 2.5,
      unit: 'rad',
      precision: 2,
      visibleIf: { system: 'pendulum' },
    }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    steps: { label: 'steps over [0, 20 s]', calc: (p) => Math.round(20 / p.h) },
    evals: {
      label: 'evaluations of f (Euler / RK2 / RK4)',
      calc: (p) => {
        const n = Math.round(20 / p.h);
        return `${n} / ${2 * n} / ${4 * n}`;
      },
    },
  },

  groups: [
    { title: 'System', params: ['system', 'theta0'] },
    { title: 'Integration', params: ['h'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // the three methods at the SAME step against the exact solution
    view(
      'trajectory',
      'Trajectory',
      line('trajExact', {
        width: 2.4,
        label: 'exact / reference',
        overlays: [
          line('trajEuler', { color: '#D95319', width: 1.8, label: 'Euler' }),
          line('trajRK2', { color: '#77AC30', width: 1.8, label: 'RK2 (midpoint)' }),
          line('trajRK4', { color: '#7E2F8E', width: 1.8, dashed: true, label: 'RK4' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'θ(t)' },
      })
    ),

    // energy ratio: Euler inflates it exponentially, RK4 holds it
    view(
      'energy',
      'Energy',
      line('energyEuler', {
        color: '#D95319',
        width: 2.2,
        label: 'Euler',
        overlays: [
          line('energyRK2', { color: '#77AC30', width: 2, label: 'RK2' }),
          line('energyRK4', { color: '#7E2F8E', width: 2, label: 'RK4' }),
          hline(() => 1, { color: '#a1a1aa', width: 1.2, dashed: true, label: 'E₀' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: { label: 'E(t)/E₀', scale: 'log' } },
      })
    ),

    // global error at T versus h: the log-log slope IS the order
    view(
      'order',
      'Error vs h',
      line('errEuler', {
        color: '#D95319',
        width: 2.2,
        label: 'Euler (slope 1)',
        overlays: [
          line('errRK2', { color: '#77AC30', width: 2.2, label: 'RK2 (slope 2)' }),
          line('errRK4', { color: '#7E2F8E', width: 2.2, label: 'RK4 (slope 4)' }),
        ],
        axes: {
          x: { label: 'h', unit: 's', scale: 'log' },
          y: { label: 'error at T', scale: 'log' },
        },
      })
    ),
  ],
};
