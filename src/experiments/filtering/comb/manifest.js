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

  doc: `The simplest recursive filter there is: the output adds to itself, delayed
by D samples — an echo of the echo of the echo, hence IIR. Its impulse
response is the geometric train gᵏ, one spike every D samples, never quite
zero; the non-recursive echo keeps TWO spikes, and the whole difference
between FIR and IIR is in that toggle.

In frequency the echo makes a comb: resonances at k·Fs/D of height 1/(1−g),
soft notches between. D sets the spacing and g the height — two parameters,
two orthogonal effects, the most legible filter of the course. The
recursive form resonates hard and notches little; the simple echo does the
opposite; and flipping the sign of g swaps resonances and notches, eating
DC at 1/(1+|g|) — the antiphase reflection that digs holes in a room's
response near a wall.

The alignment scene is the musical payoff: with Fs/D on the fundamental,
every harmonic sits on a resonance and the whole signal lifts at once;
sliding D moves the harmonics into the notches and empties the timbre —
that is a flanger. And a recursive comb plucked with noise is a guitar
string: Karplus–Strong, one teaser later in the catalogue.`,


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
