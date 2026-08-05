import { float, select } from '../../../core/fields.js';
import { view, figure, line, band, scatter, vline } from '../../../core/views.js';
import { at, GUIDE_COLOR } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'convolution',
  order: 4,
  title: 'Convolution, taken apart',
  subtitle: 'Flip, slide, integrate — and the t dial does the rest',
  tags: [
    'convolution',
    'produit de convolution',
    'impulse response',
    'gate',
    'triangle',
    'recouvrement',
    'RC',
  ],

  params: {
    t: float('t', {
      description: 'the instant being computed — THE dial: sliding it IS the animation',
      min: -1,
      max: 5,
      step: 0.01,
      default: 1,
      unit: 's',
      precision: 2,
    }),
    sig: select('x(t)', {
      description: 'the input signal',
      options: [
        { value: 'gate', label: 'gate of width a' },
        { value: 'ramp', label: 'ramp of width a' },
      ],
      default: 'gate',
    }),
    ker: select('h(t)', {
      description: 'the impulse response',
      options: [
        { value: 'gate', label: 'gate of width b' },
        { value: 'exp', label: 'exponential e^(−t/b)/b — an RC' },
      ],
      default: 'gate',
    }),
    a: float('a', { description: 'width of x', min: 0.2, max: 3, step: 0.1, default: 1, unit: 's' }),
    b: float('b', {
      description: 'width of h, or its time constant',
      min: 0.1,
      max: 3,
      step: 0.1,
      default: 1,
      unit: 's',
    }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    formula: {
      label: 'what is being computed',
      calc: (p) => `y(${(+p.t).toFixed(2)}) = ∫ x(τ)·h(${(+p.t).toFixed(2)} − τ) dτ`,
    },
    widths: {
      label: 'the widths add up',
      calc: (p) =>
        p.ker === 'gate'
          ? `supp(x) = ${p.a} s, supp(h) = ${p.b} s → supp(y) = ${(+p.a + +p.b).toFixed(1)} s`
          : 'h has infinite support, and so does y',
    },
  },

  groups: [
    { title: 'The dial', params: ['t'] },
    { title: 'The two functions', params: ['sig', 'ker', 'a', 'b'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // THE view. The whole computation happens in τ space and nowhere else:
    // x(τ) never moves, h(t−τ) is h flipped and then slid by t, and the blue
    // area under their product IS y(t). The cursor t is the only parameter that
    // moves, and sliding it does the animation by hand.
    view(
      'overlap',
      'The computation, at frozen t',
      band('shade', {
        color: '#0072BD',
        opacity: 0.28,
        label: 'area = y(t)',
        overlays: [
          line('xTau', { color: '#7E2F8E', width: 2.4, label: 'x(τ)' }),
          line('hFlip', { color: '#D95319', width: 2.4, label: 'h(t − τ)' }),
          line('product', { color: '#0072BD', width: 2, label: 'x(τ)·h(t − τ)' }),
          vline('tNow', { color: '#EDB120', width: 2, label: 't' }),
          at(0),
        ],
        axes: { x: { label: 'τ', unit: 's' }, y: 'amplitude' },
      })
    ),

    // The result, where the current point is carried over: the curve fills in as
    // t is slid on the previous view.
    figure(
      'response',
      line('yOut', {
        color: '#77AC30',
        width: 2.8,
        label: 'y(t) = (x * h)(t)',
        overlays: [
          scatter('marker', { color: '#EDB120', size: 10, label: 'current y(t)' }),
          vline('tNow', { color: '#EDB120', width: 2, label: 't' }),
          at(0),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'y(t)' },
      })
    ),
  ],
};
