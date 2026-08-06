import { float, int, select } from '../../../core/fields.js';
import { view, plane, line, scatter } from '../../../core/views.js';
import { basebandFigure } from '../_lib/baseband.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'constellations',
  order: 1,
  random: true,
  title: 'Constellations, bits and errors',
  subtitle: 'One AWGN link, read three ways: in time, in the plane, and as a waterfall',

  doc: `This is the whole of a digital link with nothing in the way: bits are
mapped onto a constellation, the constellation crosses an additive white
Gaussian noise channel, and the receiver decides for the nearest point. Every
later experiment in this subject adds one thing to it — a channel with memory,
several antennas, a code — so it is worth being able to read this one cold.

Three questions, and a tab each. What actually travels? Two real signals in
quadrature, which is what the time view shows and what a constellation plane
quietly hides. What does the receiver see? A cloud around each symbol, cut into
decision regions, with the errors marked by what they COST. And how does the
link behave as the noise recedes? The waterfall, against the closed forms.

The distinction the experiment is built to make is between a SYMBOL error and a
BIT error. They are not the same event: a symbol decided wrongly costs at least
one bit and possibly all k of them, and which it is depends on the MAPPING. Gray
coding numbers the constellation so that neighbouring points differ in a single
bit, so the errors that actually happen — the near misses — cost one bit each,
and BER ≈ SER/k. Natural binary numbers them in counting order, some neighbours
differ in three bits, and the same symbol errors cost more. Switch the pill and
watch the orange points appear: those are the errors that cost more than a bit.

The abscissa is Eb/N₀ and not Es/N₀, which is the other thing worth insisting
on. Comparing modulations at equal energy per SYMBOL flatters the dense ones —
16-QAM carries four bits in the energy QPSK spends on two. Per BIT is the
comparison an engineer can act on, and it is the axis on which BPSK and QPSK
famously coincide.`,

  tags: ['constellation', 'AWGN', 'BER', 'SER', 'Gray', 'Eb/N0', 'mapping', 'decision'],

  params: {
    mod: select('modulation', {
      description: 'transmitted constellation (unit average energy)',
      options: [
        { value: 'bpsk', label: 'BPSK (1 bit)' },
        { value: 'qpsk', label: 'QPSK (2 bits)' },
        { value: '8psk', label: '8-PSK (3 bits)' },
        { value: '16qam', label: '16-QAM (4 bits)' },
      ],
      default: 'qpsk',
    }),
    mapping: select('mapping', {
      description: 'how the bits are numbered onto the symbols',
      options: [
        { value: 'gray', label: 'Gray' },
        { value: 'natural', label: 'natural binary' },
      ],
      default: 'gray',
    }),
    ebn0Db: float('Eb/N₀', {
      description: 'energy per bit over noise density',
      min: 0,
      max: 14,
      step: 0.5,
      default: 8,
      unit: 'dB',
      precision: 1,
    }),
    N: int('N', {
      description: 'symbols transmitted',
      min: 200,
      max: 20000,
      step: 200,
      default: 3000,
    }),
    // seed injected by the core, because random: true
  },

  groups: [
    { title: 'Signal', params: ['mod', 'mapping'] },
    { title: 'Channel', params: ['ebn0Db'] },
    { title: 'Simulation', params: ['N'] },
  ],

  derived: {
    esn0: {
      label: 'Es/N₀ = k·Eb/N₀',
      calc: (p) => {
        const k = { bpsk: 1, qpsk: 2, '8psk': 3, '16qam': 4 }[p.mod];
        return `${(p.ebn0Db + 10 * Math.log10(k)).toFixed(1)} dB — ${p.N * k} bits sent`;
      },
    },
  },

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // THE SIGNAL, BEFORE THE PICTURE OF IT. The plane below is where this
    // experiment is going, and it is also where a room quietly learns the wrong
    // thing: that a symbol is a dot. It is two real signals in quadrature, and
    // this is the figure that says so — the same 24 symbols sent and received,
    // real part above, imaginary part below. The cloud on the next tab is these
    // two panels with the time thrown away.
    basebandFigure({ txLabel: 'transmitted s[n]', rxLabel: 'received y[n]', symbol: 'y' }),

    // EQUAL ASPECT, because a stretched axis turns a decision region into a
    // shape it is not. Everything the receiver knows is on this one frame: the
    // symbols with their bit patterns, the exact ML boundaries, and the errors
    // split by what they COST in bits — which is the only visible difference
    // between the two mappings.
    plane('iq', 'The plane, and what an error costs', {
      clouds: [
        {
          source: 'rxOk',
          color: '#0072BD',
          r: 1.6,
          opacity: 0.22,
          max: 2500,
          label: 'decided correctly',
        },
        { source: 'rxErr1', color: '#EDB120', r: 2.4, opacity: 0.85, label: 'one bit wrong' },
        { source: 'rxErrMulti', color: '#D95319', r: 2.8, opacity: 0.95, label: 'several bits wrong' },
      ],
      markers: { source: 'idealPoints', color: 'var(--muted-fg)', labels: 'bitLabels' },
      segments: 'boundaries',
      axes: { x: 'I', y: 'Q' },
    }),

    // SYMBOLS AND BITS ON ONE ABSCISSA. Keeping them apart was what made this
    // two experiments; putting them on one frame is what the merge is for. At
    // high SNR under a Gray mapping the two curves sit a factor k apart and
    // nothing else, because a symbol error then costs exactly one bit — and
    // with natural binary the measured BER lifts off its theory curve while
    // the SER does not move at all.
    view(
      'waterfall',
      'The waterfall: symbols and bits',
      line('serTheoryCurve', {
        color: '#D95319',
        width: 2.2,
        dashed: true,
        label: 'SER — theory',
        overlays: [
          scatter('serEmpCurve', { color: '#D95319', size: 5.5, label: 'SER — measured' }),
          line('berTheoryCurve', { color: '#7E2F8E', width: 2.4, label: 'BER — theory (Gray)' }),
          scatter('berEmpCurve', { color: '#7E2F8E', size: 5.5, label: 'BER — measured' }),
        ],
        axes: {
          x: { label: 'Eb/N₀', unit: 'dB' },
          y: { label: 'error rate', scale: 'log', domain: [1e-5, 1] },
        },
        // a waterfall descends left to right, so the empty corner is the top
        // right — the default, and the one place four legend entries fit
        // without sitting on the curves
      })
    ),
  ],
};
