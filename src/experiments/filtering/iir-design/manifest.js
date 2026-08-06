import { float, int, select } from '../../../core/fields.js';
import { view, line, vline } from '../../../core/views.js';
import { timeView, impulseView, polesView, spectrumView } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'iir-design',
  order: 5,
  title: 'IIR design by discretization',
  subtitle: 'Bilinear, pre-warping, impulse invariance — analog becomes digital',
  tags: ['digital', 'IIR', 'bilinear', 'impulse invariance', 'warping'],

  params: {
    method: select('method', {
      description: 'discretization of the analog prototype (Fs = 8 kHz)',
      options: [
        { value: 'bilinear', label: 'bilinear, pre-warped' },
        { value: 'naive', label: 'bilinear, raw' },
        { value: 'impulse', label: 'impulse invariance' },
      ],
      default: 'bilinear',
    }),
    family: select('family', {
      description: 'analog prototype (all-pole)',
      options: [
        { value: 'butter', label: 'Butterworth' },
        { value: 'cheby1', label: 'Chebyshev 1' },
      ],
      default: 'butter',
    }),
    n: int('n', { description: 'order of the prototype', min: 2, max: 8, default: 4 }),
    fc: float('f_c', {
      description: 'target cutoff frequency (at −A_max)',
      min: 200,
      max: 3500,
      step: 10,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    source: select('signal', {
      description: 'signal fed into the filter',
      options: [
        { value: 'square', label: 'square' },
        { value: 'saw', label: 'sawtooth' },
      ],
      default: 'square',
    }),
    f0: float('f₀', {
      description: 'fundamental of the input signal',
      min: 50,
      max: 800,
      step: 10,
      default: 200,
      unit: 'Hz',
      precision: 0,
    }),
    Amax: float('A_max', {
      description: 'ripple / level defining the cutoff',
      min: 0.1,
      max: 3,
      step: 0.1,
      default: 1,
      unit: 'dB',
      precision: 1,
    }),
  },

  groups: [
    { title: 'Analog prototype', params: ['family', 'n', 'Amax'] },
    { title: 'Discretization', params: ['method', 'fc'] },
    { title: 'Test signal', params: ['source', 'f0'] },
  ],

  views: [
    timeView(),
    impulseView({ source: 'impulseDig', label: 'h[n] of the digital filter' }),

    // The module's figure — input and output spectra under the response — with
    // this experiment's own second curve on it: the ANALOG prototype the
    // digital filter is trying to be. That comparison was the whole tab and it
    // showed no signal, so the discretization error was a gap between two
    // curves rather than a harmonic that came out at the wrong level.
    spectrumView({
      resp: 'respDig',
      domain: [-80, 10],
      overlays: [
        line('respAna', { color: '#77AC30', dashed: true, label: 'analog prototype' }),
        vline('fc', { color: '#EDB120', dashed: true, label: 'target f_c' }),
      ],
    }),
    polesView({
      variable: 'z',
      circle: { radius: 1, label: 'unit circle (stability)' },
      segments: [
        { x1: -1.6, y1: 0, x2: 1.6, y2: 0 },
        { x1: 0, y1: -1.6, x2: 0, y2: 1.6 },
      ],
      minHalf: 1.25,
      maxHalf: 1.6,
    }),
    view(
      'warp',
      // short on purpose: five tabs of this length are what the segmented
      // control fits before it wraps onto a second row and pushes the statline
      // off the screen. The abscissa already says 'digital f'.
      'Warping',
      line('warp', {
        width: 2,
        label: 'warping Ω(f) = 2Fs·tan(πf/Fs)',
        overlays: [
          line('warpIdent', { color: '#D95319', dashed: true, label: 'identity (2πf)' }),
          vline('fc', { color: '#EDB120', dashed: true, label: 'f_c' }),
        ],
        axes: {
          x: { label: 'digital f', unit: 'Hz' },
          y: { label: 'equivalent analog f', unit: 'Hz', domain: [0, 16000] },
        },
      })
    ),
  ],
};
