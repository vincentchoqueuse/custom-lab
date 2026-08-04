import { float, int, select } from '../../../core/fields.js';
import { view, line, scatter, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'soft-decoding',
  order: 7,
  random: true,
  title: 'Soft decoding against hard decoding',
  subtitle: 'Do not throw away the confidence: ~2 dB free, same bits, same code',
  tags: ['soft decoding', 'ML', 'Hamming', 'union bound', 'coding gain'],

  params: {
    code: select('code', {
      description: 'linear code decoded both ways',
      options: [
        { value: 'hamming74', label: 'Hamming (7,4) — R = 4/7' },
        { value: 'repetition3', label: 'repetition ×3 — R = 1/3' },
      ],
      default: 'hamming74',
    }),
    ebn0Db: float('Eb/N₀', {
      description: 'energy per useful bit over noise density',
      min: 0,
      max: 8,
      step: 0.5,
      default: 4,
      unit: 'dB',
      precision: 1,
    }),
    Nbits: int('N', {
      description: 'message bits transmitted',
      min: 1000,
      max: 100000,
      step: 1000,
      default: 40000,
    }),
    // no seed here: injected by the core
  },

  groups: [
    { title: 'Code', params: ['code'] },
    { title: 'Channel', params: ['ebn0Db', 'Nbits'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // same frames, same noise, two decoders: where hard fails and soft holds
    view(
      'frames',
      'Same frames, two decoders',
      scatter('channelErrors', {
        color: '#0072BD',
        size: 3.5,
        opacity: 0.8,
        label: 'doubtful bit (hard decision wrong)',
        overlays: [
          scatter('hardResidual', { color: '#D95319', size: 6, label: 'residual error (hard)' }),
          scatter('softResidual', { color: '#7E2F8E', size: 3.8, label: 'residual error (soft)' }),
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

    // the waterfall: uncoded, exact hard, union-bound soft, Monte Carlo soft
    view(
      'ber',
      'BER vs Eb/N₀',
      line('berUncodedTh', {
        width: 2,
        label: 'uncoded',
        overlays: [
          line('berHardTh', { color: '#D95319', width: 2.2, label: 'hard (exact theory)' }),
          line('berSoftUb', { color: '#7E2F8E', width: 1.8, dashed: true, label: 'soft (union bound)' }),
          scatter('berSoftMc', { color: '#7E2F8E', size: 5, label: 'soft (Monte Carlo)' }),
        ],
        axes: {
          x: { label: 'Eb/N₀', unit: 'dB' },
          y: { label: 'BER', scale: 'log', domain: [1e-6, 1] },
        },
      })
    ),
  ],
};
