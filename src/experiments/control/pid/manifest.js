import { float } from '../../../core/fields.js';
import { view, line, hline, vline } from '../../../core/views.js';
import { gainView, phaseView, GUIDE_COLOR } from '../../../core/response-views.js';

const GUIDE = { color: GUIDE_COLOR, width: 1, dashed: true };

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'pid',
  order: 6,
  title: 'Le PID, trois potards',
  subtitle: 'P pousse, I efface, D calme — et chacun a son prix',
  tags: ['PID', 'régulation', 'erreur statique', 'perturbation', 'boucle fermée'],

  params: {
    Kp: float('Kp', { description: 'gain proportionnel', min: 0, max: 12, step: 0.1, default: 3 }),
    Ki: float('Ki', { description: 'gain intégral', min: 0, max: 5, step: 0.05, default: 1.5, precision: 2 }),
    Kd: float('Kd', { description: 'gain dérivé (sur mesure filtrée)', min: 0, max: 5, step: 0.05, default: 1, precision: 2 }),
    sigma: float('σ', { description: 'bruit de mesure', min: 0, max: 0.05, step: 0.002, default: 0, precision: 3 }),
    // no seed here: injected by the core (noise redraw via R)
  },

  derived: {
    plant: { label: 'procédé', calc: () => 'G(s) = 1/(s+1)² — gain statique 1' },
    essTh: {
      label: 'erreur statique P seul : 1/(1+Kp)',
      calc: (p) => (p.Ki > 0 ? '0 (intégrateur)' : (1 / (1 + p.Kp)).toFixed(3)),
    },
  },

  groups: [
    { title: 'Correcteur', params: ['Kp', 'Ki', 'Kd'] },
    { title: 'Mesure', params: ['sigma'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // closed-loop output: setpoint step, then the load disturbance at t = 10
    view(
      'regulated',
      'Sortie régulée',
      line('output', {
        width: 2.4,
        label: 'y(t)',
        overlays: [
          hline(() => 1, { color: '#EDB120', dashed: true, width: 1.6, label: 'consigne' }),
          vline(() => 10, { color: '#D95319', dashed: true, width: 1.6, label: 'perturbation' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'y(t)' },
      })
    ),

    // what the actuator endures: kick, effort, noise amplification by Kd
    view(
      'command',
      'Commande u(t)',
      line('command', {
        color: '#7E2F8E',
        width: 1.8,
        label: 'u(t)',
        overlays: [
          hline(() => 0, { color: '#a1a1aa', width: 1 }),
          vline(() => 10, { color: '#D95319', dashed: true, width: 1.6, label: 'perturbation' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'u(t)' },
      })
    ),

    // The SAME loop, in frequency: L(jω) = C(jω)·G(jω), the open loop the
    // three sliders actually shape. Titled and ordered as everywhere else in
    // the subject. What to make the students see: Ki lifts the low-frequency
    // gain to infinity and pins the phase at −90° (that IS "no static
    // error"), Kp slides the whole gain curve up, and Kd lifts the phase back
    // near the crossover — which is why a loop that oscillates in the time
    // view is a loop whose phase margin has been eaten in this one.
    gainView('gain', {
      title: 'Bode — gain',
      overlays: [hline('zeroDb', { ...GUIDE, label: '0 dB' })],
    }),

    phaseView('phase', {
      overlays: [hline(() => -180, { ...GUIDE, label: '−180°' })],
    }),
  ],
};
