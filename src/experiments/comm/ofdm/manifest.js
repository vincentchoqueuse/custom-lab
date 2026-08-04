import { float, int, select } from '../../../core/fields.js';
import { view, plane, line, scatter } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'ofdm',
  order: 6,
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
      max: 200,
      default: 50,
    }),
  },

  derived: {
    cpOk: {
      label: 'prefix long enough?',
      calc: (p) => (p.cp >= p.L - 1 ? 'oui (L_cp ≥ L−1)' : 'NON — ISI'),
    },
  },

  groups: [
    { title: 'Channel', params: ['L', 'snr'] },
    { title: 'OFDM', params: ['Nc', 'cp', 'M'] },
  ],

  views: [
    view(
      'channel',
      'The channel seen by the carriers',
      line('channel', {
        width: 2,
        axes: {
          x: 'subcarrier k',
          y: { label: '|H_k|²', unit: 'dB', domain: [-40, 12] },
        },
      })
    ),
    plane('constellation', 'Constellation', {
      clouds: [
        { source: 'rxRaw', color: '#7E2F8E', r: 1.5, opacity: 0.18, label: 'before equalization' },
        { source: 'rxEq', color: '#0072BD', r: 1.7, opacity: 0.4, label: 'after ZF (1 tap per carrier)' },
      ],
      markers: { source: 'ideal', color: '#EDB120', label: 'ideal QPSK' },
      minHalf: 1.6,
      maxHalf: 2.5,
    }),
    view(
      'ber',
      'Errors per carrier',
      scatter('berMeasured', {
        size: 3,
        opacity: 0.85,
        label: 'measured BER',
        overlays: [
          line('berTheory', { color: '#D95319', width: 2, label: 'Q(√(|H_k|²·SNR))' }),
        ],
        axes: { x: 'subcarrier k', y: 'BER' },
      })
    ),
  ],
};
