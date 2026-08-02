import { float, log, select } from '../../../core/fields.js';
import { view, line, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'runge-kutta',
  order: 1,
  title: 'Euler, RK2, RK4 : l\'ordre se paie',
  subtitle: 'Intégrer une équation différentielle — la pente de l\'erreur est l\'ordre',
  tags: ['Runge-Kutta', 'Euler', 'EDO', 'ordre', 'pendule', 'simulation'],

  params: {
    system: select('système', {
      description: 'équation différentielle intégrée',
      options: [
        { value: 'pendulum', label: 'pendule non linéaire (θ″ = −sin θ)' },
        { value: 'linear', label: 'second ordre amorti (m=0.2, ω₀=2)' },
      ],
      default: 'pendulum',
    }),
    h: log('h', { description: 'pas d\'intégration', min: 0.005, max: 0.4, default: 0.1, unit: 's' }),
    theta0: float('θ₀', {
      description: 'amplitude initiale du pendule',
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
    steps: { label: 'pas sur [0, 20 s]', calc: (p) => Math.round(20 / p.h) },
    evals: {
      label: 'évaluations de f (Euler / RK2 / RK4)',
      calc: (p) => {
        const n = Math.round(20 / p.h);
        return `${n} / ${2 * n} / ${4 * n}`;
      },
    },
  },

  groups: [
    { title: 'Système', params: ['system', 'theta0'] },
    { title: 'Intégration', params: ['h'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // the three methods at the SAME step against the exact solution
    view(
      'trajectory',
      'Trajectoire',
      line('trajExact', {
        width: 2.4,
        label: 'exacte / référence',
        overlays: [
          line('trajEuler', { color: '#D95319', width: 1.8, label: 'Euler' }),
          line('trajRK2', { color: '#77AC30', width: 1.8, label: 'RK2 (point milieu)' }),
          line('trajRK4', { color: '#7E2F8E', width: 1.8, dashed: true, label: 'RK4' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'θ(t)' },
      })
    ),

    // energy ratio: Euler inflates it exponentially, RK4 holds it
    view(
      'energy',
      'Énergie',
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
      'Erreur vs h',
      line('errEuler', {
        color: '#D95319',
        width: 2.2,
        label: 'Euler (pente 1)',
        overlays: [
          line('errRK2', { color: '#77AC30', width: 2.2, label: 'RK2 (pente 2)' }),
          line('errRK4', { color: '#7E2F8E', width: 2.2, label: 'RK4 (pente 4)' }),
        ],
        axes: {
          x: { label: 'h', unit: 's', scale: 'log' },
          y: { label: 'erreur à T', scale: 'log' },
        },
      })
    ),
  ],
};
