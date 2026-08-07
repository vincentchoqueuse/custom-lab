import { float, int, select } from '../../../core/fields.js';
import { figure, line, stem, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'dac',
  order: 4,
  title: 'Upsampling and interpolation',
  subtitle: 'Zeros, then a filter — and what each step does to the spectrum',
  tags: ['digital', 'upsampling', 'interpolation', 'zero stuffing', 'images', 'DAC'],

  doc: `From samples to a signal at L times the rate, in two steps — and the first
one computes nothing at all. Inserting L−1 zeros between the samples adds
no information and changes the spectrum not at all: X_up(f) = X(f) exactly,
verified to 1e-12. What changes is the BAND the view shows, now reaching
L·Fs/2, and the spectral copies that had always existed at k·Fs ± f₀ are
suddenly inside it: the images, exactly L−1 of them. Only one sample in L
being non-zero, the average power has also been divided by L.

The second step is a low-pass at Fs/2 with gain L, drawn over the spectrum
so that what it keeps and cuts is visible. The images fall by 62 dB, the
zeros become a sinusoid — and the interpolated curve passes EXACTLY through
the original samples, because the kernel is 1 at the center and 0 at every
other multiple of L. The data were not approximated, they were kept. The
useful line comes back up by 20·log₁₀(L), the filter returning the power
the stuffing divided.

The filter's length is the engineering. Too short and the image survives
almost untouched; lengthening it helps — but not monotonically, since the
stop-band ripple slides as the length changes and the image falls sometimes
into a notch, sometimes onto a lobe: measured, M = 4 is worse than M = 2.
"Longer, therefore better" is true on average and false in particular,
which is exactly why one measures. And the filter runs at L·Fs, so
upsampling is not free — merely far cheaper than an analog filter of the
same steepness.`,


  params: {
    // THE STEP is a parameter, not a tab: the two figures stay the same and it
    // is the chain that advances on them. A scene therefore opens at the step
    // the lecture has reached, and its URL carries it.
    stage: select('stage', {
      description: 'stage reached in the chain',
      options: [
        { value: 'samples', label: '1 — the samples, at Fs' },
        { value: 'stuffed', label: '2 — zero stuffing' },
        { value: 'filtered', label: '3 — interpolated' },
      ],
      default: 'samples',
    }),
    L: select('L', {
      description: 'upsampling factor',
      options: [
        { value: 2, label: '×2' },
        { value: 4, label: '×4' },
        { value: 8, label: '×8' },
      ],
      default: 4,
    }),
    f0: float('f', {
      description: 'signal frequency (Fs = 8 kHz)',
      min: 100,
      max: 3500,
      step: 10,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    half: int('M', {
      description: 'half-length of the filter, in periods of Fs',
      min: 1,
      max: 16,
      default: 8,
    }),
  },

  groups: [
    { title: 'Chain', params: ['stage', 'L'] },
    { title: 'Signal', params: ['f0'] },
    { title: 'Interpolation filter', params: ['half'] },
  ],

  // actions omitted → the experiment draws nothing: no dice, only freeze

  views: [
    // The time view first — that is where the GESTURE is seen: zeros appear
    // between the samples, then fill in.
    figure(
      'time',
      stem('stems', {
        color: '#0072BD',
        size: 3.4,
        label: 'current stream',
        overlays: [
          line('ideal', { color: '#a1a1aa', width: 1.2, label: 'continuous signal' }),
          line('filtered', { color: '#D95319', width: 2, label: 'after the filter' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: 'x' },
      })
    ),

    // And the spectrum, which tells the other half: zero-stuffing changes
    // NOTHING there — it widens the band, which brings the copies in. The filter
    // erases them.
    figure(
      'spectrum',
      line('spectrum', {
        color: '#0072BD',
        width: 1.6,
        label: 'current stream',
        overlays: [
          line('response', { color: '#D95319', width: 1.8, label: '|H(f)| of the filter' }),
          vline('nyquistBase', { color: '#EDB120', width: 1.6, label: 'Fs/2 — useful band' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|X(f)|', unit: 'dB', domain: [-90, 5] },
        },
      })
    ),
  ],
};
