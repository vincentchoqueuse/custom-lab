import { float, int, select } from '../../../core/fields.js';
import { view, figure, custom, line, stem, scatter, hline, vline } from '../../../core/views.js';

const KEYS = ['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D'];

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'dtmf',
  // Fourth, and it is the subject applied: the projector is the matched filter,
  // the modulus is the GLRT statistic, and choosing among sixteen keys is
  // M-ary detection. Nothing new is introduced — three things are used.
  order: 4,
  random: true,
  title: 'DTMF — detecting a telephone key',
  subtitle: 'Two tones in noise, eight projections, one keypad',
  tags: ['DTMF', 'projection', 'Goertzel', 'Rayleigh', 'Rice', 'M-ary detection'],
  doc: `A telephone key is two sinusoids at once, one from a low group and one
        from a high group, and the receiver must say which of sixteen pairs
        arrived. It is the detection subject applied, with nothing new in it.

        The projector onto {cos, sin} at a given tone IS the matched filter,
        written for a signal whose phase is unknown. The modulus of the
        estimated amplitude IS the GLRT statistic — amplitude and phase
        maximised out — so it is Rice when the tone is there and Rayleigh when
        it is not. And scoring sixteen keys by the sum of two energies is M-ary
        detection.

        The design question the experiment is built around: how long must the
        window be? Too short and the two tones are not resolved and the noise
        floor E|â| = σ√(π/N) rises to meet them; too long and the receiver
        misses a key that was pressed quickly. The standard answers about 40 ms,
        and the figures say why.

        Two details reward a closer look. The eight frequencies — 697, 770,
        852, 941 against 1209, 1336, 1477, 1633 — were chosen so that none is
        a harmonic or a sum of two others: a voice on the line produces
        harmonics, and those pairs make sure a voice does not accidentally
        spell a digit. And the failures have structure: a wrong decision is
        almost never random but a neighbour in the same row or column, one
        tone recovered and the other lost. Even the model has an honest edge —
        above about 15 dB the spread of the estimated amplitude is leakage
        from the other tone rather than noise, and the Rice law visibly stops
        being the right description.`,

  params: {
    key: select('key', {
      description: 'the key pressed',
      options: KEYS.map((k) => ({ value: k, label: k })),
      default: '5',
    }),
    ms: float('T', {
      description: 'duration of the analysis window',
      min: 2,
      max: 100,
      step: 1,
      default: 40,
      unit: 'ms',
      precision: 0,
    }),
    snrDb: float('SNR', {
      description: 'signal-to-noise ratio per tone',
      min: -25,
      max: 30,
      step: 1,
      default: 10,
      unit: 'dB',
      precision: 0,
    }),
    M: int('M', {
      description: 'bursts drawn for the histograms and the success rate',
      min: 200,
      max: 6000,
      step: 200,
      default: 1600,
    }),
    // seed injected by the core, because random: true
  },

  validate: [
    {
      // The Monte Carlo runs M bursts of N samples through eight projections,
      // and the lecture guard is 1.5 s. This is the first line of defence the
      // contract asks for; without it a 100 ms window at M = 4000 aborted the
      // computation in front of the room.
      when: (p) => (p.M * p.ms * 8000) / 1000 > 1.5e6,
      message: 'M × N too large to stay responsive — shorten the window or lower M',
    },
  ],

  derived: {
    N: { label: 'samples at Fs = 8 kHz', calc: (p) => Math.round((p.ms * 8000) / 1000) },
    cycles: {
      label: 'cycles of the lowest tone in the window',
      calc: (p) => ((697 * p.ms) / 1000).toFixed(1),
    },
  },

  groups: [
    { title: 'The key', params: ['key'] },
    { title: 'The channel', params: ['ms', 'snrDb'] },
    { title: 'Simulation', params: ['M'] },
  ],

  views: [
    figure(
      'time',
      line('tNoisy', {
        color: '#a1a1aa',
        width: 1,
        label: 'received',
        overlays: [line('tClean', { color: '#D95319', width: 1.8, label: 'the two tones, clean' })],
        axes: { x: { label: 't', unit: 'ms' }, y: 'x(t)' },
      })
    ),

    // THE estimator's output, and the figure a room reads the decision off:
    // eight stems, two of which should stand well above the floor.
    view(
      'amplitudes',
      'The eight amplitudes',
      stem('amplitudes', {
        color: '#0072BD',
        size: 5,
        width: 2.4,
        label: '|â| of each DTMF tone',
        overlays: [
          scatter('sentTones', { color: '#EDB120', size: 9, label: 'the two tones sent' }),
          hline('floorLine', {
            color: '#D95319',
            dashed: true,
            width: 1.8,
            label: 'E|â| if absent = σ√(π/N)',
          }),
        ],
        axes: { x: { label: 'f', unit: 'Hz' }, y: '|â|' },
      })
    ),

    custom('keypad', 'The keypad', () => import('./views/Keypad.svelte')),

    // The two laws, and the reason this is a detection experiment rather than a
    // demonstration: the decision is a threshold between a Rayleigh and a Rice,
    // and the window length is what pulls them apart.
    view(
      'laws',
      'Rayleigh against Rice',
      line('histOff', {
        color: '#a1a1aa',
        width: 1.6,
        label: 'measured, tone ABSENT',
        overlays: [
          line('histOn', { color: '#0072BD', width: 1.6, label: 'measured, tone PRESENT' }),
          line('pdfRayleigh', { color: '#7E2F8E', width: 2.2, dashed: true, label: 'Rayleigh(σ√(2/N))' }),
          line('pdfRice', { color: '#D95319', width: 2.2, dashed: true, label: 'Rice(A, σ√(2/N))' }),
          vline('floorLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'E|â| if absent' }),
        ],
        axes: { x: '|â|', y: 'density' },
      })
    ),
  ],
};
