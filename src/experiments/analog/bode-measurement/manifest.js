import { float, log, select } from '../../../core/fields.js';
import { view, line, scatter, vline } from '../../../core/views.js';
import { gainView, phaseView, HERTZ } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'bode-measurement',
  order: 2,
  random: true,
  title: 'Frequency response on the scope',
  subtitle: 'Bode point by point: two traces, one ratio, one phase shift',
  tags: ['analog', 'Bode', 'oscilloscope', 'measurement', 'RC', 'resonance'],

  params: {
    system: select('system', {
      description: 'circuit under test',
      options: [
        { value: 'rc', label: 'RC low-pass' },
        { value: 'order2', label: 'resonant (second order)' },
      ],
      default: 'rc',
    }),
    f: log('f', {
      description: 'generator frequency',
      min: 10,
      max: 10000,
      default: 100,
      unit: 'Hz',
      precision: 0,
    }),
    fc: log('f_c', {
      description: 'cutoff frequency of the RC',
      min: 50,
      max: 5000,
      default: 500,
      unit: 'Hz',
      precision: 0,
      visibleIf: { system: 'rc' },
    }),
    f0: log('f₀', {
      description: 'natural frequency of the resonator',
      min: 50,
      max: 5000,
      default: 500,
      unit: 'Hz',
      precision: 0,
      visibleIf: { system: 'order2' },
    }),
    Q: log('Q', {
      description: 'quality factor',
      min: 0.5,
      max: 20,
      default: 2,
      precision: 2,
      visibleIf: { system: 'order2' },
    }),
    sigma: float('σ', {
      description: 'measurement noise (scope and wiring)',
      min: 0,
      max: 0.3,
      step: 0.01,
      default: 0.05,
      precision: 2,
    }),
  },

  groups: [
    { title: 'Circuit', params: ['system', 'fc', 'f0', 'Q'] },
    { title: 'Measurement bench', params: ['f', 'sigma'] },
  ],

  views: [
    view(
      'scope',
      'The scope',
      line('scopeOut', {
        color: '#D95319',
        width: 1.6,
        label: 'output',
        overlays: [line('scopeIn', { color: '#0072BD', label: 'input' })],
        axes: { x: { label: 't', unit: 'ms' }, y: 'voltage (V)' },
      })
    ),
    // The two halves of a Bode plot, built by the shared frequency figures —
    // the abscissa is in hertz here and in rad/s in automatique, and that is
    // the ONLY difference between this plot and the one in Bode, Nyquist,
    // Black. What the experiment adds is its own: the measured points over
    // the theory, and the vline on the pulsation currently being swept.
    gainView('gainTheory', {
      variant: 'bode',
      x: HERTZ,
      domain: [-65, 30],
      label: 'theory',
      color: undefined,
      width: 2,
      overlays: [
        scatter('gainMeas', { color: '#D95319', size: 3.5, opacity: 0.9, label: 'measurements' }),
        vline('f', { color: '#EDB120', dashed: true, label: 'f' }),
      ],
    }),
    phaseView('phaseTheory', {
      variant: 'bode',
      x: HERTZ,
      domain: [-190, 10],
      label: 'theory',
      color: undefined,
      width: 2,
      overlays: [
        scatter('phaseMeas', { color: '#D95319', size: 3.5, opacity: 0.9, label: 'measurements' }),
        vline('f', { color: '#EDB120', dashed: true, label: 'f' }),
      ],
    }),
  ],
};
