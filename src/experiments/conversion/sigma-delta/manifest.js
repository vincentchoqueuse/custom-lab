import { float, int, select } from '../../../core/fields.js';
import { view, figure, line, band, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'sigma-delta',
  // Last of the conversion chapter: quantization says what a bit is worth,
  // sampling says what a rate is worth, and this one trades one for the other.
  order: 5,
  title: 'Noise shaping — the one-bit converter',
  subtitle: 'Sample far too fast, and put the noise where the signal is not',
  tags: ['sigma-delta', 'noise shaping', 'oversampling', 'NTF', 'SQNR', 'ENOB'],
  doc: `A converter has two ways to be accurate. The obvious one is to add
        comparators: every bit is 6 dB, and every bit is silicon, matching and
        money. The other is to sample far faster than the signal needs and to
        arrange for the quantization noise to be somewhere the signal is not.

        With a noise transfer function (1 − z⁻¹)^L the noise is multiplied by
        |2 sin(πf/Fs)|^L — zero at DC, rising towards Fs/2 — while the signal
        passes untouched. A decimator downstream keeps the band and throws away
        the rest, noise included.

        The gain is (20L + 10)·log10(OSR): nine decibels per octave of
        oversampling at first order, fifteen at second, against six per BIT for
        a plain converter. And the bill, which the experiment also measures: the
        TOTAL noise gets worse, because shaping moves noise rather than removing
        it.`,

  params: {
    bits: int('b', { description: 'quantizer resolution', min: 1, max: 8, default: 1, unit: 'bits' }),
    order: select('L', {
      description: 'order of the noise transfer function (1 − z⁻¹)^L',
      options: [
        { value: 1, label: '1 — first order, 9 dB per octave' },
        { value: 2, label: '2 — second order, 15 dB per octave' },
      ],
      default: 1,
    }),
    osr: select('OSR', {
      description: 'oversampling ratio: the band kept is Fs/(2·OSR)',
      options: [4, 8, 16, 32, 64, 128].map((v) => ({ value: v, label: `×${v}` })),
      default: 64,
    }),
    amp: float('A', {
      description: 'input amplitude, full scale = 1',
      min: 0.05,
      max: 0.9,
      step: 0.05,
      default: 0.4,
      precision: 2,
    }),
    fin: float('f', {
      description: 'input frequency, as a fraction of the band edge',
      min: 0.05,
      max: 0.9,
      step: 0.05,
      default: 0.4,
      precision: 2,
    }),
    // no seed: the modulator is deterministic, and the core injects one anyway
    // only for experiments that declare random — this one does not.
  },

  derived: {
    band: { label: 'band kept', calc: (p) => `Fs/${2 * p.osr}` },
    law: {
      label: 'theory (20L + 10)·log10(OSR)',
      calc: (p) => `${((20 * p.order + 10) * Math.log10(p.osr)).toFixed(1)} dB above the quantizer`,
    },
  },

  groups: [
    { title: 'Converter', params: ['bits', 'order', 'osr'] },
    { title: 'Input', params: ['amp', 'fin'] },
  ],

  views: [
    figure(
      'time',
      line('tIn', {
        color: '#D95319',
        width: 2,
        label: 'input x[n]',
        overlays: [
          line('tOut', { color: '#a1a1aa', width: 1, label: 'the bit stream y[n]' }),
          line('tRec', { color: '#0072BD', width: 2.2, label: 'after the decimator' }),
        ],
        axes: { x: 'n', y: 'amplitude' },
      })
    ),

    // THE figure: the noise swept out of the band, with the closed form it was
    // designed to lying on top of it.
    figure(
      'spectrum',
      line('specOut', {
        color: '#0072BD',
        width: 1.2,
        label: 'the bit stream',
        overlays: [
          line('ntfCurve', { color: '#D95319', width: 2.2, label: 'floor × |2 sin(πf)|^L' }),
          vline('bandEdge', { color: '#EDB120', dashed: true, width: 1.8, label: 'Fs/(2·OSR)' }),
        ],
        axes: {
          x: { label: 'f / Fs' },
          y: { label: 'amplitude', unit: 'dB', domain: [-140, 5] },
        },
      })
    ),

    view(
      'sqnr',
      'SQNR vs oversampling',
      line('sqnrCurve', {
        color: '#0072BD',
        width: 2.4,
        label: 'measured, by re-running the modulator',
        overlays: [
          line('slope1', { color: '#D95319', width: 1.6, dashed: true, label: '9 dB per octave' }),
          line('slope2', { color: '#77AC30', width: 1.6, dashed: true, label: '15 dB per octave' }),
          vline('osrLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'current OSR' }),
        ],
        axes: { x: 'log₂(OSR)', y: { label: 'in-band SQNR', unit: 'dB' } },
      })
    ),
  ],
};
