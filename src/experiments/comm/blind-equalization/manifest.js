import { float, int, log, select, coeffs } from '../../../core/fields.js';
import { view, plane, line, stem, vline, hline } from '../../../core/views.js';
import { basebandFigure } from '../_lib/baseband.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'blind-equalization',
  order: 5, // after OFDM: the other answer to a selective channel, and the hardest
  random: true, // symbols and noise are drawn
  title: 'Blind equalization',
  subtitle: 'Undoing a channel without a training sequence — and what it costs',
  tags: ['CMA', 'Godard', 'blind', 'equalization', 'ISI', 'PSK', 'phase ambiguity'],

  params: {
    mod: select('modulation', {
      description: 'transmitted constellation',
      options: [
        { value: 'qpsk', label: 'QPSK (constant modulus)' },
        { value: '8psk', label: '8-PSK (constant modulus)' },
        { value: '16qam', label: '16-QAM (three moduli)' },
      ],
      default: 'qpsk',
    }),
    h: coeffs('h', {
      description: 'channel taps, most recent first',
      maxLen: 5,
      default: [1, 0.5, -0.2],
    }),
    phi: float('φ', {
      description: 'carrier phase the receiver does not know',
      min: -90,
      max: 90,
      step: 5,
      default: 0,
      unit: '°',
      precision: 0,
    }),
    snr: float('SNR', {
      description: 'signal-to-noise ratio at the receiver',
      min: 5,
      max: 40,
      step: 1,
      default: 25,
      unit: 'dB',
      precision: 0,
    }),
    L: int('L', { description: 'equalizer taps', min: 3, max: 21, default: 11 }),
    mu: log('μ', {
      // log, because the useful range spans two decades and the step is the
      // whole tuning problem — same trade-off as the supervised experiment.
      description: 'step size',
      min: 1e-4,
      max: 1e-2,
      default: 2e-3,
      precision: 5,
    }),
    n: int('n', {
      description: 'iteration observed — the dial that replaces an animation',
      min: 0,
      max: 8000,
      step: 50,
      default: 8000,
    }),
    // seed injected by the core, because random: true
  },

  groups: [
    { title: 'Signal', params: ['mod'] },
    { title: 'Channel', params: ['h', 'phi', 'snr'] },
    { title: 'Equalizer', params: ['L', 'mu'] },
    { title: 'Reading', params: ['n'] },
  ],

  derived: {
    // What the room should be able to check in its head: the constant the
    // algorithm aims at, and whether the constellation lets it reach zero.
    modulus: {
      label: 'constant modulus?',
      calc: (p) => (p.mod === '16qam' ? 'no — three distinct moduli' : 'yes — one modulus'),
    },
  },

  views: [
    // WHAT THE CHANNEL DID, before any algorithm is named. Blue: the levels
    // that were sent. Orange: what arrived — every value in between, because
    // each received sample is a MIXTURE of its symbol and the neighbours the
    // channel dragged into it. Intersymbol interference is that picture, and
    // the blob on the next tab is its consequence rather than its definition.
    basebandFigure({
      txLabel: 'transmitted s[n]',
      rxLabel: 'received x[n]',
      symbol: 'x',
      // THREE trains, because two left the room guessing which one the
      // algorithm produced. Blue was sent, orange came off the channel, green
      // is what the equalizer makes of the orange at iteration n — so the
      // convergence is watched here, on the signal, and not only as a cloud
      // tightening on the next tab.
      after: { i: 'eqI', q: 'eqQ', label: 'equalized y[n]' },
    }),

    // THE view, and the subject of the experiment: a blob of received samples
    // closing onto the constellation with no reference anywhere. Equal aspect,
    // because a stretched axis would turn a rotation into a shear and this whole
    // experiment is about reading a rotation.
    plane('constellation', 'The constellation', {
      clouds: [
        // what arrives, in chrome grey: it is the context, not the subject
        { source: 'received', color: '#a1a1aa', r: 2, opacity: 0.5, max: 1200, label: 'received' },
        { source: 'cloud', color: '#0072BD', r: 2.4, opacity: 0.75, max: 1200, label: 'equalized' },
      ],
      // the transmitted points, as the truth to land on — and the rotation is
      // the gap between them and the blue cloud
      markers: { source: 'ideal', color: '#EDB120', label: 'transmitted' },
      axisLines: true,
      axes: { x: 'I', y: 'Q' },
    }),

    // The cost, and the only line that matters on it: the floor this
    // constellation imposes. On a PSK that floor is exactly zero and the line is
    // absent — the absence is the result.
    view(
      'cost',
      'Godard cost',
      line('cost', {
        color: '#0072BD',
        width: 1.8,
        label: 'J(n) = E[(|y|²−R₂)²]',
        overlays: [
          hline('floorLine', {
            color: '#D95319',
            dashed: true,
            width: 1.8,
            label: 'floor E[(|s|²−R₂)²]',
          }),
          vline('nLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'n' }),
        ],
        axes: {
          x: { label: 'iteration' },
          y: { label: 'J', scale: 'log', domain: [1e-3, 3] },
        },
      })
    ),

    // Where the truth is read rather than guessed: the channel and the equalizer
    // composed. A single spike means the channel is undone; anything else is the
    // interference that remains, whatever the constellation looks like.
    view(
      'combined',
      'Channel ∗ equalizer',
      stem('response', {
        color: '#7E2F8E',
        size: 4.5,
        label: '|h ∗ w|',
        axes: { x: { label: 'tap' }, y: { label: '|h ∗ w|' } },
      })
    ),
  ],
};
