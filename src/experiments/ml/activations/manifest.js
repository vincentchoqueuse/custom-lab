import { float, select } from '../../../core/fields.js';
import { view, figure, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'activations',
  order: 3, // the network starts here, once the linear methods are done
  random: true, // the "noise" input draws
  title: 'Activation functions',
  subtitle: 'A memoryless nonlinearity: what it does to a curve, and to a spectrum',
  tags: ['networks', 'activation', 'ReLU', 'tanh', 'nonlinearity', 'harmonics'],

  doc: `Six activations, each read twice: the curve and its derivative. The
derivative is where deep learning lives — sigmoid's is 0.25 at BEST, so
ten stacked layers multiply the gradient by 10⁻⁶: the vanishing gradient
is nothing mysterious, it is repeated multiplication, and ReLU replaces
the factor by 1. A bias only slides the curve, which is already a great
deal: it chooses where in the curve the signal works.

The spectral views read a nonlinearity the way an electronics course
would. A sinusoid through a ReLU is half-wave rectification, its Fourier
series known since 1822 and verified here to 1e-12; through tanh the even
harmonics vanish, because an odd function of a sinusoid can only contain
odd harmonics — the parity of the function is legible in the spectrum. Two
tones produce intermodulation, and the awkward line 2f₁−f₂ lands INSIDE
the useful band where no filter removes it: the plague of amplifiers and
converters, and also what a network does deliberately at every layer. Its
small-signal three-for-one law in dB is measured exactly — and measured
leaving its domain, the slope dropping once tanh compresses.

The identity closes the argument: a linear layer invents no frequency, and
ten linear layers are the product of ten matrices, which is one matrix.
Depth buys nothing without a nonlinearity — the reason this file exists.`,


  params: {
    act: select('activation', {
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
      // matched to the ±2 the transfer curve now spans: a bias that can push
      // the knee out of the frame is a dial with an invisible half
      min: -2,
      max: 2,
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
