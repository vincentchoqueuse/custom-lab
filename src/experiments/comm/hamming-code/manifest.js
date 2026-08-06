import { float, int, select } from '../../../core/fields.js';
import { view, line, scatter, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'hamming-code',
  order: 8, // coding opens here, once the link itself is understood
  random: true,
  title: 'The Hamming (7,4) code',
  subtitle: 'Correcting one error per frame — and the real price of the rate given up',
  tags: ['coding', 'Hamming', 'BER', 'syndrome', 'coding gain'],

  params: {
    code: select('code', {
      description: 'error-correcting code compared with no coding',
      options: [
        { value: 'hamming74', label: 'Hamming (7,4) — R = 4/7' },
        { value: 'repetition3', label: 'repetition ×3 — R = 1/3' },
      ],
      default: 'hamming74',
    }),
    ebn0Db: float('Eb/N₀', {
      description: 'energy per useful bit over noise density',
      min: 0,
      max: 12,
      step: 0.5,
      default: 5,
      unit: 'dB',
      precision: 1,
    }),
    Nbits: int('N', {
      description: 'message bits transmitted',
      min: 1000,
      max: 100000,
      step: 1000,
      default: 20000,
    }),
    // no seed here: injected by the core
  },

  derived: {
    rate: { label: 'rate R = k/n', calc: (p) => (p.code === 'hamming74' ? '4/7 ≈ 0.571' : '1/3 ≈ 0.333') },
    tax: {
      label: 'rate penalty −10·log₁₀(R)',
      calc: (p) => `${(-10 * Math.log10(p.code === 'hamming74' ? 4 / 7 : 1 / 3)).toFixed(2)} dB`,
    },
  },

  groups: [
    { title: 'Code', params: ['code'] },
    { title: 'Channel', params: ['ebn0Db', 'Nbits'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // frames as columns: channel errors, and what survives the decoder
    view(
      'frames',
      'Decoded frames',
      scatter('channelErrors', {
        color: '#0072BD',
        size: 3.5,
        opacity: 0.8,
        label: 'channel error',
        overlays: [
          scatter('residualErrors', { color: '#D95319', size: 5.5, label: 'residual error (message)' }),
          hline((p) => (p.code === 'hamming74' ? 4.5 : NaN), {
            color: '#a1a1aa',
            width: 1,
            dashed: true,
            label: 'data | parity',
          }),
        ],
        axes: { x: 'trame', y: 'position du bit' },
      })
    ),

    // the waterfall: uncoded vs exact coded theory vs Monte Carlo
    view(
      'ber',
      'BER vs Eb/N₀',
      line('berUncodedTh', {
        width: 2.2,
        label: 'uncoded',
        overlays: [
          line('berCodedTh', { color: '#7E2F8E', width: 2.4, label: 'coded (exact theory)' }),
          scatter('berCodedMc', { color: '#D95319', size: 5, label: 'Monte Carlo' }),
        ],
        axes: {
          x: { label: 'Eb/N₀', unit: 'dB' },
          y: { label: 'BER', scale: 'log', domain: [1e-6, 1] },
        },
      })
    ),
  ],
};
