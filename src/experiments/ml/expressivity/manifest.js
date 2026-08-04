import { float, int, select } from '../../../core/fields.js';
import { view, figure, line, stem } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'expressivity',
  order: 4,
  random: true, // the weights are drawn
  title: 'Expressive power',
  subtitle: 'Two layers, random weights — and what the structure of the matrix decides',
  tags: ['networks', 'linear layer', 'convolution', 'Toeplitz', 'weight sharing'],

  params: {
    structure: select('structure', {
      description: 'structure of the layer matrix',
      options: [
        { value: 'dense', label: 'dense — N² independent weights' },
        { value: 'toeplitz', label: 'Toeplitz — a convolution' },
      ],
      default: 'toeplitz',
    }),
    act: select('σ', {
      description: 'activation between the two layers',
      options: [
        { value: 'identity', label: 'identity — none' },
        { value: 'relu', label: 'ReLU' },
        { value: 'tanh', label: 'tanh' },
        { value: 'gelu', label: 'GELU' },
      ],
      default: 'relu',
    }),
    kernel: int('L', {
      description: 'kernel length (Toeplitz structure)',
      min: 1,
      max: 33,
      default: 9,
      visibleIf: { structure: 'toeplitz' },
    }),
    scale: float('α', {
      description: 'scale of the weights',
      min: 0.2,
      max: 4,
      step: 0.1,
      default: 1.5,
      precision: 1,
    }),
    signal: select('input', {
      description: 'signal fed to the network',
      options: [
        { value: 'sine', label: 'sinusoid (8 Hz)' },
        { value: 'two', label: 'two tones (6 + 20 Hz)' },
        { value: 'pulse', label: 'impulse' },
        { value: 'noise', label: 'white noise' },
      ],
      default: 'sine',
    }),
  },

  groups: [
    { title: 'Layer', params: ['structure', 'kernel', 'scale'] },
    { title: 'Network', params: ['act'] },
    { title: 'Input', params: ['signal'] },
  ],

  views: [
    // What the network DOES to the signal, with its own control: the same
    // architecture without an activation. The gap between the two curves IS the
    // power the activation adds — zero when σ = identity, and seeing that is
    // half the experiment.
    figure(
      'time',
      line('xTime', {
        color: '#7E2F8E',
        width: 1.4,
        opacity: 0.7,
        label: 'input',
        overlays: [
          line('yTime', { color: '#0072BD', width: 2, label: 'network output' }),
          line('yLinTime', { color: '#a1a1aa', width: 1.4, dashed: true, label: 'without activation' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: { label: 'amplitude' } },
      })
    ),

    // The spectrum, where the structure gives itself away: Toeplitz FILTERS
    // (the input spectrum multiplied by |H|), dense mixes everything.
    figure(
      'spectrum',
      line('specOut', {
        color: '#0072BD',
        width: 1.6,
        label: 'output',
        overlays: [
          line('specIn', { color: '#7E2F8E', width: 1.4, opacity: 0.55, label: 'input' }),
          line('response', { color: '#D95319', width: 1.8, label: '|H(f)| of the kernel' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: 'amplitude', unit: 'dB', domain: [-60, 3] },
        },
      })
    ),

    // THE view that explains the phrase "weight sharing": two rows of the
    // matrix, taken at two places. Dense, they have nothing in common;
    // Toeplitz, it is the SAME one, shifted. There is nothing else to
    // understand.
    view(
      'rows',
      'Two rows of W₁',
      stem('row', {
        color: '#0072BD',
        size: 3,
        label: 'row 8',
        overlays: [stem('rowMid', { color: '#D95319', size: 3, label: 'row 64' })],
        legend: 'left',
        axes: { x: { label: 'column j' }, y: { label: 'W₁[i, j]' } },
      })
    ),
  ],
};
