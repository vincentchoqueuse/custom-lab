import { float, log, select } from '../../../core/fields.js';
import { view, line, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'runge-kutta',
  order: 1,
  title: 'Euler, RK2, RK4: order has a price',
  subtitle: 'Integrating a differential equation — the slope of the error is the order',
  tags: ['Runge–Kutta', 'Euler', 'ODE', 'order', 'pendulum', 'simulation'],

  params: {
    system: select('system', {
      description: 'differential equation integrated',
      options: [
        { value: 'pendulum', label: 'nonlinear pendulum (θ″ = −sin θ)' },
        { value: 'linear', label: 'damped second order (m=0.2, ω₀=2)' },
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
