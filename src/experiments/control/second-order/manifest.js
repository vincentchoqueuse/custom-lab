import { float, log } from '../../../core/fields.js';
import { view, line, vline, hline, figure } from '../../../core/views.js';
import { at, gainView, phaseView, polesView, GUIDE, GUIDE_COLOR } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'second-order',
  order: 2,
  title: 'Second-order response',
  subtitle: 'm and ω₀ tell the whole story: time, poles and frequency of one system',
  tags: ['second order', 'damping', 'poles', 'resonance', 'step response'],

  doc: `Two numbers and the whole dynamics: ω₀ is the time scale, m is the SHAPE.
At m = 0.3 the step response rings under an exponential envelope, with the
overshoot e^(−mπ/√(1−m²)) printed beside the measurement; m = 0.7 leaves a
single rebound, m = 1 is critical — the fastest without overshoot, a
compromise rather than a law — and beyond it one pole heads toward zero
and its slow mode drags everything.

The pole view is the geometry: both poles travel the circle of radius ω₀
at angle cos⁻¹(m), meeting at −ω₀ when m = 1, then separating along the
real axis. Moving ω₀ inflates the circle without changing the shape.

In frequency, |H| bulges below m = 1/√2 at ωr = ω₀√(1−2m²) with height
K/(2m√(1−m²)) — 8 dB above K at m = 0.2 — and the bump vanishes exactly at
0.707. The practical closing is identification: measuring K, Mr and ωr on
a real Bode plot is enough to RECOVER m and ω₀, the reverse path of
everything done here.`,


  params: {
    K: float('K', { description: 'static gain', min: 0.2, max: 2, step: 0.05, default: 1 }),
    m: float('m', {
      description: 'damping ratio',
      min: 0.05,
      max: 2,
      step: 0.05,
      default: 0.3,
      precision: 2,
    }),
    w0: log('ω₀', {
      description: 'natural frequency',
      min: 0.5,
      max: 20,
      default: 2,
      unit: 'rad/s',
    }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    regime: {
      label: 'regime',
      calc: (p) =>
        p.m < 1 ? 'underdamped (m < 1)' : p.m === 1 ? 'critically damped (m = 1)' : 'overdamped (m > 1)',
    },
    q: { label: 'quality factor Q = 1/2m', calc: (p) => (1 / (2 * p.m)).toFixed(2) },
  },

  groups: [
    { title: 'System', params: ['K', 'm', 'w0'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // step response with the exponential envelope and the ±5% band
    figure(
      'step',
      line('stepResponse', {
        width: 2.5,
        label: 'y(t)',
        overlays: [
          line('envHi', { color: '#D95319', width: 1.3, dashed: true, label: 'envelope' }),
          line('envLo', { color: '#D95319', width: 1.3, dashed: true }),
          hline((p) => p.K, { color: '#EDB120', dashed: true, width: 1.6, label: 'K' }),
          hline((p) => 1.05 * p.K, { color: GUIDE_COLOR, width: 1 }),
          hline((p) => 0.95 * p.K, { color: GUIDE_COLOR, width: 1, label: '±5%' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'y(t)' },
      })
    ),

    // impulse response: the same two parameters, seen as a free oscillation
    figure(
      'impulse',
      line('impulseResponse', {
        color: '#0072BD',
        width: 2.5,
        label: 'h(t)',
        overlays: [
          hline(() => 0, { color: GUIDE_COLOR, width: 1 }),
          vline((p) => Math.PI / (p.w0 * Math.sqrt(Math.max(1 - p.m * p.m, 0))), {
            color: '#EDB120',
            dashed: true,
            width: 1.4,
            label: 'T_d/2',
          }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'h(t)' },
      })
    ),

    // equal-aspect plane: the poles travel on the ω₀ circle as m varies,
    // then split on the real axis
    // a pure second order has no zero: polesView omits the cloud rather than
    // leaving an empty legend entry
    polesView({
      zeros: null,
      circle: { radius: (p) => p.w0, label: 'circle |s| = ω₀' },
      minHalf: (p) => Math.max(1.3 * p.w0, 1),
      maxHalf: 60,
    }),

    // The Bode pair, titled and ordered as everywhere else in the subject.
    // The resonance shows on the gain when m < 1/√2; the phase always
    // crosses −90° at ω₀ and ends at −180°.
    gainView('gain', {
      overlays: [
        vline((p) => p.w0, { color: '#EDB120', dashed: true, width: 1.8, label: 'ω₀' }),
        vline('wr', { color: '#D95319', dashed: true, width: 1.6, label: 'ωr' }),
        hline('gainK', { ...GUIDE, label: 'K' }),
      ],
    }),

    phaseView('phase', {
      overlays: [
        vline((p) => p.w0, { color: '#EDB120', dashed: true, width: 1.8, label: 'ω₀' }),
        at(-90, '−90°'),
        at(-180, '−180°'),
      ],
    }),
  ],
};
