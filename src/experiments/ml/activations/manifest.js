import { float, select } from '../../../core/fields.js';
import { view, figure, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'activations',
  order: 1,
  random: true, // the "noise" input draws
  title: 'Activation functions',
  subtitle: 'A memoryless nonlinearity: what it does to a curve, and to a spectrum',
  tags: ['networks', 'activation', 'ReLU', 'tanh', 'nonlinearity', 'harmonics'],

  params: {
    act: select('σ', {
      description: 'activation function',
      options: [
        { value: 'identity', label: 'identity — none' },
        { value: 'relu', label: 'ReLU' },
        { value: 'leaky', label: 'leaky ReLU (0.01)' },
        { value: 'tanh', label: 'tanh' },
        { value: 'sigmoid', label: 'sigmoid' },
        { value: 'gelu', label: 'GELU' },
      ],
      default: 'relu',
    }),
    signal: select('input', {
      description: 'signal fed to the activation',
      options: [
        { value: 'sine', label: 'sinusoid (16 Hz)' },
        { value: 'two', label: 'two tones (16 + 21 Hz)' },
        { value: 'square', label: 'square wave' },
        { value: 'noise', label: 'white noise' },
      ],
      default: 'sine',
    }),
    gain: float('g', {
      description: 'gain before the activation — this is what drives it into saturation',
      min: 0.1,
      max: 8,
      step: 0.1,
      default: 1,
      precision: 1,
    }),
    bias: float('b', {
      description: 'bias before the activation',
      min: -3,
      max: 3,
      step: 0.1,
      default: 0,
      precision: 1,
    }),
  },

  groups: [
    { title: 'Activation', params: ['act'] },
    { title: 'Input', params: ['signal', 'gain', 'bias'] },
  ],

  views: [
    // The curve FIRST, because it is the object itself — and its derivative
    // with it: an activation is chosen as much for what it lets through of the
    // gradient as for its shape.
    view(
      'transfer',
      'σ(x) and its derivative',
      line('transfer', {
        color: '#0072BD',
        width: 2.4,
        label: 'σ(x)',
        overlays: [
          line('derivative', { color: '#D95319', width: 2, label: 'σ′(x)' }),
          line('identity', { color: '#a1a1aa', width: 1.2, dashed: true, label: 'identity' }),
          vline((p) => p.bias, { color: '#EDB120', dashed: true, width: 1.4, label: 'bias' }),
          hline(() => 0, { color: '#e4e4e7', width: 1 }),
        ],
        legend: 'left',
        axes: { x: { label: 'x' }, y: { label: 'σ(x), σ′(x)' } },
      })
    ),

    // THE DERIVATIVES, all together — the textbook figure, and the only one
    // that answers "which to choose". At a glance one reads the three deciding
    // facts: ReLU returns 1 or 0 with no nuance, tanh starts at 1 and collapses,
    // the sigmoid caps at 1/4. Clicking a chip switches its curve off, to
    // compare them two at a time.
    view(
      'derivatives',
      'Derivatives compared',
      line('dRelu', {
        color: '#0072BD',
        width: 2,
        label: 'ReLU′',
        overlays: [
          line('dLeaky', { color: '#77AC30', width: 1.6, dashed: true, label: 'leaky ReLU′' }),
          line('dTanh', { color: '#D95319', width: 2, label: 'tanh′' }),
          line('dSigmoid', { color: '#7E2F8E', width: 2, label: 'sigmoid′' }),
          line('dGelu', { color: '#EDB120', width: 2, label: 'GELU′' }),
        ],
        legend: 'left',
        // the frame goes down to −0.2 to show that GELU′ goes BELOW zero
        // (minimum −0.13): it is not monotone, unlike the other four, and that
        // is a property not to be cropped away
        axes: { x: { label: 'x' }, y: { label: 'σ′(x)', domain: [-0.2, 1.2] } },
      })
    ),

    // The time view: clipping, rectifying, or doing nothing at all.
    figure(
      'time',
      line('xTime', {
        color: '#7E2F8E',
        width: 1.6,
        label: 'input g·x + b',
        overlays: [line('yTime', { color: '#0072BD', width: 2, label: 'σ(g·x + b)' })],
        axes: { x: { label: 't', unit: 'ms' }, y: { label: 'amplitude' } },
      })
    ),

    // And the spectrum, which is the point: a nonlinearity CREATES
    // frequencies. Both spectra are normalized to their own maximum, so what is
    // compared is the RICHNESS, not the level.
    figure(
      'spectrum',
      line('specOut', {
        color: '#0072BD',
        width: 1.6,
        label: 'after σ',
        overlays: [
          line('specIn', { color: '#7E2F8E', width: 1.4, opacity: 0.55, label: 'before' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz', domain: [0, 200] },
          y: { label: 'amplitude', unit: 'dB', domain: [-90, 3] },
        },
      })
    ),
  ],
};
