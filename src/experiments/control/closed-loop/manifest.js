import { float, log } from '../../../core/fields.js';
import { view, figure, line, scatter, vline, hline } from '../../../core/views.js';
import { at, gainView, phaseView, GUIDE, GUIDE_COLOR } from '../../../core/response-views.js';

const CLOSED = '#D95319'; // the closed loop, the same colour everywhere

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'closed-loop',
  order: 5,
  title: 'Closing the loop on a second order',
  subtitle: 'One dial K — and the system changes speed, overshoot and error',
  tags: [
    'closed loop',
    'retour unitaire',
    'gain proportionnel',
    'abaque de Nichols',
    'contours iso-gain',
    'erreur statique',
    'résonance',
  ],

  params: {
    K: log('K', {
      description: 'proportional loop gain',
      min: 0.1,
      max: 30,
      default: 4,
      precision: 2,
    }),
    w0: log('ω₀', {
      description: 'natural frequency of the plant',
      min: 0.2,
      max: 20,
      default: 1,
      unit: 'rad/s',
      precision: 2,
    }),
    m: float('m', {
      description: 'damping of the plant',
      min: 0.05,
      max: 2,
      step: 0.05,
      default: 0.5,
      precision: 2,
    }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    closed: {
      label: 'closed loop',
      calc: (p) => {
        const r = Math.sqrt(1 + p.K);
        return `ω₀√(1+K) = ${(p.w0 * r).toFixed(3)} · m/√(1+K) = ${(p.m / r).toFixed(3)}`;
      },
    },
    invariant: {
      label: 'mω₀ (unchanged)',
      calc: (p) => `${(p.m * p.w0).toFixed(3)} rad/s — même enveloppe en BO et en BF`,
    },
  },

  groups: [
    { title: 'The loop', params: ['K'] },
    { title: 'The plant', params: ['w0', 'm'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // The same step, sent to both systems. The open loop rises to K, the closed
    // loop to K/(1+K): the feedback BRINGS the gain back towards 1, and the gap
    // that remains is the steady-state error 1/(1+K).
    figure(
      'response',
      line('stepClosed', {
        color: CLOSED,
        width: 2.6,
        label: 'closed loop',
        overlays: [
          line('stepOpen', { width: 1.8, dashed: true, label: 'open loop' }),
          hline('setpoint', { color: '#EDB120', width: 1.6, dashed: true, label: 'setpoint' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'y(t)' },
      })
    ),

    // The two Bode plots superposed: |L| crosses 0 dB, |T| starts at the DC gain
    // K/(1+K) and peaks the more the tighter the loop is.
    gainView('gain', {
      label: 'open loop |L(jω)|',
      overlays: [
        line('gainClosed', { color: CLOSED, width: 2.4, label: 'closed loop' }),
        vline('wrOut', { color: '#EDB120', dashed: true, width: 1.6, label: 'ω_r' }),
        at(0, '0 dB'),
      ],
    }),

    phaseView('phase', {
      label: 'open loop arg L(jω)',
      overlays: [
        line('phaseClosed', { color: CLOSED, width: 2.4, label: 'closed loop' }),
        at(-90, '−90°'),
        at(-180, '−180°'),
      ],
    }),

    // The Nichols chart, in its place: the OPEN-LOOP locus on the iso-gain
    // contours of the CLOSED LOOP. The highlighted contour is that of the
    // resonance computed in closed form — so the tangency is a verification, not
    // an estimate.
    // The chart is the MAIN source and the locus an overlay: layers are drawn in
    // the order declared, and a reading grid belongs UNDER the curve one reads on
    // it.
    view(
      'black',
      'Black — Nichols chart',
      line('isoGain', {
        color: GUIDE_COLOR,
        width: 1,
        dashed: true,
        label: 'closed-loop iso-gain',
        overlays: [
          line('isoPeak', { color: '#EDB120', width: 1.8, label: 'closed-loop resonance' }),
          line('black', { color: '#0072BD', width: 2.6, label: 'locus of L(jω)' }),
          scatter('criticalBlack', { color: GUIDE_COLOR, size: 6, label: 'critical point' }),
          hline(() => 0, { color: GUIDE_COLOR, width: 1 }),
          vline(() => -180, { ...GUIDE, label: '−180°' }),
        ],
        axes: {
          x: { label: 'arg L', unit: '°' },
          // fixed frame: the locus dives towards −∞ dB as ω → ∞, and letting it
          // dictate the scale would crush the only band where the chart reads
          y: { label: '|L|', unit: 'dB', domain: [-30, 30] },
        },
      })
    ),
  ],
};
