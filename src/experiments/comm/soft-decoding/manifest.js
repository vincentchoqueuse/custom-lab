import { float, int, select } from '../../../core/fields.js';
import { view, line, scatter, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'soft-decoding',
  order: 5,
  random: true,
  title: 'Décodage souple contre décodage dur',
  subtitle: 'Ne jetez pas la confiance : ~2 dB gratuits, mêmes bits, même code',
  tags: ['décodage souple', 'ML', 'Hamming', 'borne de l\'union', 'gain de codage'],

  params: {
    code: select('code', {
      description: 'code linéaire décodé des deux façons',
      options: [
        { value: 'hamming74', label: 'Hamming (7,4) — R = 4/7' },
        { value: 'repetition3', label: 'répétition ×3 — R = 1/3' },
      ],
      default: 'hamming74',
    }),
    ebn0Db: float('Eb/N₀', {
      description: 'énergie par bit utile sur densité de bruit',
      min: 0,
      max: 8,
      step: 0.5,
      default: 4,
      unit: 'dB',
      precision: 1,
    }),
    Nbits: int('N', {
      description: 'bits de message transmis',
      min: 1000,
      max: 100000,
      step: 1000,
      default: 40000,
    }),
    // no seed here: injected by the core
  },

  groups: [
    { title: 'Code', params: ['code'] },
    { title: 'Canal', params: ['ebn0Db', 'Nbits'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // same frames, same noise, two decoders: where hard fails and soft holds
    view(
      'frames',
      'Mêmes trames, deux décodeurs',
      scatter('channelErrors', {
        color: '#0072BD',
        size: 3.5,
        opacity: 0.8,
        label: 'bit douteux (décision dure fausse)',
        overlays: [
          scatter('hardResidual', { color: '#D95319', size: 6, label: 'erreur résiduelle (dur)' }),
          scatter('softResidual', { color: '#7E2F8E', size: 3.8, label: 'erreur résiduelle (souple)' }),
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

    // the waterfall: uncoded, exact hard, union-bound soft, Monte Carlo soft
    view(
      'ber',
      'BER vs Eb/N₀',
      line('berUncodedTh', {
        width: 2,
        label: 'sans codage',
        overlays: [
          line('berHardTh', { color: '#D95319', width: 2.2, label: 'dur (théorie exacte)' }),
          line('berSoftUb', { color: '#7E2F8E', width: 1.8, dashed: true, label: 'souple (borne de l\'union)' }),
          scatter('berSoftMc', { color: '#7E2F8E', size: 5, label: 'souple (Monte Carlo)' }),
        ],
        axes: {
          x: { label: 'Eb/N₀', unit: 'dB' },
          y: { label: 'BER', scale: 'log', domain: [1e-6, 1] },
        },
      })
    ),
  ],
};
