import { float, int, select } from '../../../core/fields.js';
import { vline } from '../../../core/views.js';
import { timeView, impulseView, spectrumView } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'comb',
  order: 2,
  title: 'The IIR comb filter',
  subtitle: 'An echo in time, a comb in frequency — D sets the teeth, g their depth',
  tags: ['digital', 'comb', 'echo', 'flanger', 'Karplus–Strong'],

  params: {
    structure: select('structure', {
      description: 'simple echo (FIR) or recursive (IIR)',
      options: [
        { value: 'ff', label: 'simple (FIR)' },
        { value: 'fb', label: 'recursive (IIR)' },
      ],
      default: 'fb',
    }),
    D: int('D', {
      description: 'delay in samples (teeth spaced by Fs/D, Fs = 8 kHz)',
      min: 8,
      max: 160,
      default: 40,
    }),
    g: float('g', {
      description: 'echo gain (negative swaps teeth and notches)',
      min: -0.95,
      max: 0.95,
      step: 0.01,
      default: 0.7,
      precision: 2,
    }),
    source: select('source', {
      description: 'periodic input signal',
      options: [
        { value: 'square', label: 'square' },
        { value: 'saw', label: 'sawtooth' },
      ],
      default: 'square',
    }),
    f0: float('f₀', {
      description: 'fundamental of the signal',
      min: 50,
      max: 400,
      step: 1,
      default: 110,
      unit: 'Hz',
      precision: 0,
    }),
  },

  groups: [
    { title: 'Filter', params: ['structure', 'D', 'g'] },
    { title: 'Signal', params: ['source', 'f0'] },
  ],

  views: [
    timeView(),
    impulseView(),
    spectrumView({
      overlays: [vline((p) => 8000 / p.D, { color: '#EDB120', dashed: true, label: 'Fs/D' })],
    }),
  ],
};
