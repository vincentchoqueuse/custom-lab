import { float, int, select } from '../../../core/fields.js';
import { view, line, scatter, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'hamming-code',
  order: 4,
  random: true,
  title: 'Le code de Hamming (7,4)',
  subtitle: 'Corriger une erreur par trame — et le vrai prix du débit sacrifié',
  tags: ['codage', 'Hamming', 'BER', 'syndrome', 'gain de codage'],

  params: {
    code: select('code', {
      description: 'code correcteur comparé au sans-codage',
      options: [
        { value: 'hamming74', label: 'Hamming (7,4) — R = 4/7' },
        { value: 'repetition3', label: 'répétition ×3 — R = 1/3' },
      ],
      default: 'hamming74',
    }),
    ebn0Db: float('Eb/N₀', {
      description: 'énergie par bit utile sur densité de bruit',
      min: 0,
      max: 12,
      step: 0.5,
      default: 5,
      unit: 'dB',
      precision: 1,
    }),
    Nbits: int('N', {
      description: 'bits de message transmis',
      min: 1000,
      max: 100000,
      step: 1000,
      default: 20000,
    }),
    // no seed here: injected by the core
  },

  derived: {
    rate: { label: 'rendement R = k/n', calc: (p) => (p.code === 'hamming74' ? '4/7 ≈ 0.571' : '1/3 ≈ 0.333') },
    tax: {
      label: 'taxe de rendement −10·log₁₀(R)',
      calc: (p) => `${(-10 * Math.log10(p.code === 'hamming74' ? 4 / 7 : 1 / 3)).toFixed(2)} dB`,
    },
  },

  groups: [
    { title: 'Code', params: ['code'] },
    { title: 'Canal', params: ['ebn0Db', 'Nbits'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // frames as columns: channel errors, and what survives the decoder
    view(
      'frames',
      'Trames décodées',
      scatter('channelErrors', {
        color: '#0072BD',
        size: 3.5,
        opacity: 0.8,
        label: 'erreur canal',
        overlays: [
          scatter('residualErrors', { color: '#D95319', size: 5.5, label: 'erreur résiduelle (message)' }),
          hline((p) => (p.code === 'hamming74' ? 4.5 : NaN), {
            color: '#a1a1aa',
            width: 1,
            dashed: true,
            label: 'données | parités',
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
        label: 'sans codage',
        overlays: [
          line('berCodedTh', { color: '#7E2F8E', width: 2.4, label: 'avec code (théorie exacte)' }),
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
