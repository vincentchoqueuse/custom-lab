import { float, int, select } from '../../../core/fields.js';
import { view, custom, line, scatter } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'ber-chain',
  title: 'La chaîne BER complète',
  subtitle: 'Bits, codage de Gray, Eb/N₀ : la comparaison honnête des modulations',
  tags: ['BER', 'Gray', 'Eb/N0', 'mapping', 'chaîne de transmission'],

  params: {
    mod: select('modulation', {
      description: 'constellation émise (énergie moyenne unité)',
      options: [
        { value: 'bpsk', label: 'BPSK (1 bit/symbole)' },
        { value: 'qpsk', label: 'QPSK (2 bits/symbole)' },
        { value: '8psk', label: '8-PSK (3 bits/symbole)' },
        { value: '16qam', label: '16-QAM (4 bits/symbole)' },
      ],
      default: 'qpsk',
    }),
    mapping: select('mapping', {
      description: 'association bits → symboles',
      options: [
        { value: 'gray', label: 'Gray (voisins à 1 bit)' },
        { value: 'natural', label: 'binaire naturel' },
      ],
      default: 'gray',
    }),
    ebn0Db: float('Eb/N₀', {
      description: 'énergie par bit sur densité de bruit',
      min: 0,
      max: 14,
      step: 0.5,
      default: 6,
      unit: 'dB',
      precision: 1,
    }),
    Nbits: int('N', {
      description: 'nombre de bits transmis',
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
    { title: 'Émission', params: ['mod', 'mapping'] },
    { title: 'Canal', params: ['ebn0Db', 'Nbits'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // CUSTOM view: equal-aspect plane + per-symbol bit labels + error clouds
    // split by bit cost; rendering delegated to the generic ui/plots/IQPlane.
    custom('mapping', 'Constellation & bits', () => import('./views/BitMapping.svelte')),

    // The waterfall: Gray theory against Monte Carlo (with natural mapping,
    // the MC points detaching from the curve IS the lesson).
    view(
      'ber',
      'BER vs Eb/N₀',
      line('berTheoryCurve', {
        color: '#7E2F8E',
        width: 2.4,
        label: 'théorie (Gray)',
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
