import { float, int, select } from '../../../core/fields.js';
import { view, figure, plane, line, scatter, stem, band, vline, figureStack, stack } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'ofdm',
  order: 4, // the first answer to the eye the channel just closed
  random: true,
  title: 'OFDM and the selective channel',
  subtitle: 'The channel digs holes; the FFT flattens it, carrier by carrier',
  tags: ['OFDM', 'multipath', 'cyclic prefix', 'equalization'],

  params: {
    Nc: select('N', {
      description: 'number of subcarriers',
      options: [
        { value: 16, label: '16' },
        { value: 32, label: '32' },
        { value: 64, label: '64' },
        { value: 128, label: '128' },
      ],
      default: 64,
    }),
    L: int('L', {
      description: 'length of the multipath channel (samples)',
      min: 1,
      max: 12,
      default: 6,
    }),
    cp: int('L_cp', {
      description: 'length of the cyclic prefix (must cover L − 1)',
      min: 0,
      max: 16,
      default: 8,
    }),
    snr: float('SNR', {
      description: 'signal-to-noise ratio per subcarrier',
      min: 0,
      max: 30,
      step: 0.5,
      default: 15,
      unit: 'dB',
      precision: 1,
    }),
    M: int('M', {
      description: 'number of OFDM symbols simulated',
      min: 10,
      max: 400,
      // 150 and not 50: the constellation now shows ONE subcarrier, so the
      // cloud has M points and not M×N of them.
      default: 150,
    }),
    k: int('k', {
      description: 'subcarrier read on the constellation',
      min: 0,
      max: 127,
      default: 0,
    }),
  },

  validate: [
    { when: (p) => p.k >= p.Nc, message: 'the subcarrier read must be below N' },
  ],

  derived: {
    cpOk: {
      label: 'prefix long enough?',
      calc: (p) => (p.cp >= p.L - 1 ? 'yes (L_cp ≥ L−1)' : 'NO — ISI'),
    },
  },

  groups: [
    { title: 'Channel', params: ['L', 'snr'] },
    { title: 'OFDM', params: ['Nc', 'cp', 'M'] },
  ],

  views: [
    // WHAT WENT ON EACH CARRIER, AND WHAT CAME BACK OFF IT — the figure the
    // rest of the experiment is about, and the one the pill drives. Blue is
    // what the transmitter loaded onto carrier k; orange is what the one-tap
    // equalizer handed back. Where the channel is strong they sit on top of
    // each other; in a fade the orange scatters, and that is the whole story
    // of a selective channel told once, before any spectrum is drawn.
    //
    // The abscissa is the CARRIER INDEX and not raw time, deliberately: it is
    // the same abscissa as the channel figure two tabs along, so the pill's
    // vertical there and the green point here are the same place. Time is on
    // the next tab, where the frame lives.
    stack(
      'symbols',
      'Symbols in, symbols out',
      [
        stem('symI', {
          color: '#0072BD',
          width: 1.6,
          size: 2.6,
          label: 'sent',
          overlays: [
            stem('eqSymI', { color: '#D95319', width: 1.4, size: 2.4, label: 'equalized' }),
            scatter('selI', { color: '#77AC30', size: 7, label: 'the carrier in the pill' }),
          ],
          axes: { y: { label: 'Re' } },
        }),
        stem('symQ', {
          color: '#0072BD',
          width: 1.6,
          size: 2.6,
          overlays: [
            stem('eqSymQ', { color: '#D95319', width: 1.4, size: 2.4 }),
            scatter('selQ', { color: '#77AC30', size: 7 }),
          ],
          axes: { y: { label: 'Im' } },
        }),
      ],
      { axes: { x: { label: 'subcarrier k' } } }
    ),

    // THE PREFIX, AS AN OBJECT. Everything else here lives in frequency, where
    // OFDM is elegant and where the prefix cannot be seen — it was a parameter
    // with a consequence and never a thing. Two symbols of the transmitted
    // signal, with the prefix at the head of each and the samples it is a COPY
    // of marked in the same yellow at the tail: the eye matches the two
    // segments before anyone says the word "cyclic".
    figureStack(
      'time',
      [
        line('txI', { color: '#0072BD', width: 1.6, label: 'transmitted x[n]',
                      axes: { y: { label: 'Re x[n]' } } }),
        line('txQ', { color: '#0072BD', width: 1.6, axes: { y: { label: 'Im x[n]' } } }),
      ],
      {
        axes: { x: { label: 'sample n' } },
        // The prefix and the frame boundaries mark a place in TIME, so they
        // belong to the shared abscissa and are drawn on both parts. The
        // prefix is a copy of the tail in Re AND in Im — one panel could not
        // have shown that.
        overlays: [
          band('cpBand', { color: '#D95319', opacity: 0.22, label: 'cyclic prefix' }),
          vline('frame0', { color: '#18181b', width: 1.8, label: 'start of a frame' }),
          vline('frame1', { color: '#18181b', width: 1.8 }),
        ],
      }
    ),

    view(
      'channel',
      'The channel',
      line('channel', {
        width: 2,
        label: '|H_k|²',
        overlays: [
          vline('kLine', { color: '#D95319', width: 2, label: 'the subcarrier read' }),
        ],
        axes: {
          x: 'subcarrier k',
          y: { label: '|H_k|²', unit: 'dB', domain: [-40, 12] },
        },
      })
    ),
    // ONE SUBCARRIER AT A TIME. Pooling all N of them into a single cloud
    // averaged away the very thing the experiment is about: each carrier has
    // its own H_k, so each has its own rotation before equalization and its own
    // spread after it. Walking k along the pill turns the channel's landscape
    // into a sequence of constellations — tight on a ridge, exploded in a fade.
    plane('constellation', 'Constellation', {
      clouds: [
        { source: 'rxRaw', color: '#7E2F8E', r: 2.4, opacity: 0.45, label: 'before equalization' },
        { source: 'rxEq', color: '#0072BD', r: 2.4, opacity: 0.6, label: 'after ZF (1 tap)' },
      ],
      markers: { source: 'ideal', color: '#EDB120', label: 'ideal QPSK' },
      minHalf: 1.6,
      maxHalf: 4,
    }),
    view(
      'ber',
      'Errors',
      scatter('berMeasured', {
        size: 3,
        opacity: 0.85,
        label: 'measured BER',
        overlays: [
          line('berTheory', { color: '#D95319', width: 2, label: 'Q(√(|H_k|²·SNR))' }),
          vline('kLine', { color: '#D95319', width: 2, label: 'the subcarrier read' }),
        ],
        axes: { x: 'subcarrier k', y: 'BER' },
      })
    ),
  ],
};
