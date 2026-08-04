import { float, int, select } from '../../../core/fields.js';
import { view, plane, line, scatter } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'ber-chain',
  order: 2,
  random: true,
  title: 'The complete BER chain',
  subtitle: 'Bits, Gray coding, Eb/N₀: the honest comparison of modulations',
  tags: ['BER', 'Gray', 'Eb/N0', 'mapping', 'transmission chain'],

  params: {
    mod: select('modulation', {
      description: 'transmitted constellation (unit average energy)',
      options: [
        { value: 'bpsk', label: 'BPSK (1 bit/symbol)' },
        { value: 'qpsk', label: 'QPSK (2 bits/symbol)' },
        { value: '8psk', label: '8-PSK (3 bits/symbol)' },
        { value: '16qam', label: '16-QAM (4 bits/symbol)' },
      ],
      default: 'qpsk',
    }),
    mapping: select('mapping', {
      description: 'bits to symbols mapping',
      options: [
        { value: 'gray', label: 'Gray (neighbours differ by 1 bit)' },
        { value: 'natural', label: 'natural binary' },
      ],
      default: 'gray',
    }),
    ebn0Db: float('Eb/N₀', {
      description: 'energy per bit over noise density',
      min: 0,
      max: 14,
      step: 0.5,
      default: 6,
      unit: 'dB',
      precision: 1,
    }),
    Nbits: int('N', {
      description: 'number of bits transmitted',
      min: 1000,
      max: 100000,
      step: 1000,
      default: 20000,
    }),
    // no seed here: injected by the core
  },

  derived: {
    esn0: {
      label: 'Es/N₀ = k·Eb/N₀',
      calc: (p) => {
        const k = { bpsk: 1, qpsk: 2, '8psk': 3, '16qam': 4 }[p.mod];
        return `${(p.ebn0Db + 10 * Math.log10(k)).toFixed(1)} dB`;
      },
    },
  },

  groups: [
    { title: 'Transmitter', params: ['mod', 'mapping'] },
    { title: 'Channel', params: ['ebn0Db', 'Nbits'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // equal-aspect plane: per-symbol bit labels, error clouds split by bit cost
    plane('mapping', 'Constellation & bits', {
      clouds: [
        { source: 'rxOk', color: '#0072BD', r: 1.6, opacity: 0.22, max: 2500, label: 'decided correctly' },
        { source: 'rxErr1', color: '#EDB120', r: 2.4, opacity: 0.85, label: 'single-bit error' },
        { source: 'rxErrMulti', color: '#D95319', r: 2.8, opacity: 0.95, label: 'multi-bit error' },
      ],
      markers: { source: 'idealPoints', color: 'var(--muted-fg)', labels: 'bitLabels' },
    }),

    // The waterfall: Gray theory against Monte Carlo (with natural mapping,
    // the MC points detaching from the curve IS the lesson).
    view(
      'ber',
      'BER vs Eb/N₀',
      line('berTheoryCurve', {
        color: '#7E2F8E',
        width: 2.4,
        label: 'theory (Gray)',
        overlays: [
          scatter('berEmpCurve', { color: '#D95319', size: 5, label: 'Monte Carlo' }),
        ],
        axes: {
          x: { label: 'Eb/N₀', unit: 'dB' },
          y: { label: 'BER', scale: 'log', domain: [1e-5, 1] },
        },
      })
    ),
  ],
};
