import { float, select } from '../../../core/fields.js';
import { view, line, scatter, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'am-fm',
  order: 6,
  title: 'AM and FM modulation',
  subtitle: 'Sidebands, Bessel lines and the Carson rule',
  tags: ['analog', 'AM', 'FM', 'Bessel', 'Carson', 'modulation'],

  doc: `Two modulations of one carrier, each with its arc. In AM the message lives
in the sidebands at ±f_m, and k_a moves them by 20·log₁₀(k_a/2) while the
carrier stays put: at k_a = 0.5 some 89 % of the power sits in a carrier
that carries no information, which is the case against AM in one number.
Past k_a = 1 the two envelopes cross, and an envelope detector — the diode
of a crystal set — sees the message folded: that is why k_a ≤ 1, and why AM
radio sounds the way it does when the transmitter is pushed.

In FM the spectrum grows lines in pairs with amplitudes J_n(β), widening as
β rises; Carson's rule 2(β+1)f_m sits in the statline next to the measured
98 % bandwidth. At β = 2.405, the first zero of J₀, the carrier vanishes
entirely even though only the phase is modulated — not a curiosity but the
classical way FM transmitter deviation was calibrated: find the null on a
spectrum analyser, and Δf = 2.405·f_m exactly.`,


  params: {
    mode: select('mode', {
      description: 'modulation type (1 kHz carrier)',
      options: [
        { value: 'am', label: 'AM' },
        { value: 'fm', label: 'FM' },
      ],
      default: 'am',
    }),
    fm: float('f_m', {
      description: 'message frequency',
      min: 20,
      max: 200,
      step: 0.5,
      default: 62.5,
      unit: 'Hz',
      precision: 1,
    }),
    ka: float('k_a', {
      description: 'AM modulation index (overmodulation above 1)',
      min: 0,
      max: 1.5,
      step: 0.05,
      default: 0.5,
      precision: 2,
      visibleIf: { mode: 'am' },
    }),
    beta: float('β', {
      description: 'FM modulation index (carrier null at 2.405)',
      min: 0.1,
      max: 8,
      step: 0.005,
      default: 1,
      precision: 3,
      visibleIf: { mode: 'fm' },
    }),
  },

  views: [
    figure(
      'time',
      line('sig', {
        label: 's(t)',
        overlays: [
          line('envUp', { color: '#D95319', dashed: true, label: 'envelope' }),
          line('envDown', { color: '#D95319', dashed: true }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 's(t)' },
      })
    ),
    figure(
      'spectrum',
      line('spectrum', {
        label: 'measured',
        overlays: [scatter('theoryLines', { color: '#D95319', size: 3.5, label: 'theory' })],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|S(f)|', unit: 'dB', domain: [-70, 5] },
        },
      })
    ),
  ],
};
