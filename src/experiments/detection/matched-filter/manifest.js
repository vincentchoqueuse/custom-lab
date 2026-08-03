import { int, log, select } from '../../../core/fields.js';
import { view, line, scatter, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'matched-filter',
  order: 2,
  random: true,
  title: 'Le filtre adapté',
  subtitle: 'Corréler avec ce que l\'on cherche : le pic sort du bruit, gain 10·log₁₀(N)',
  tags: ['filtre adapté', 'corrélation', 'SNR', 'gain de traitement', 'radar'],

  params: {
    shape: select('impulsion', {
      description: 'forme de l\'impulsion connue',
      options: [
        { value: 'rect', label: 'rectangulaire' },
        { value: 'halfsine', label: 'demi-sinus' },
        { value: 'gauss', label: 'gaussienne' },
      ],
      default: 'rect',
    }),
    N: int('N', { description: 'longueur de l\'impulsion', min: 4, max: 128, default: 32, unit: 'éch.' }),
    snr: log('SNR', {
      description: 'rapport signal à bruit par échantillon (linéaire)',
      min: 0.01,
      max: 10,
      default: 0.2,
    }),
    tau: int('τ', { description: 'retard de l\'impulsion', min: 0, max: 256, default: 32, unit: 'éch.' }),
    M: int('M', {
      description: 'tirages Monte Carlo (vue Gain)',
      min: 100,
      max: 5000,
      step: 100,
      default: 800,
    }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (p) => p.tau > 2 * p.N, message: 'τ doit rester ≤ 2N (fenêtre de 3N échantillons)' },
  ],

  derived: {
    gainDb: { label: 'gain = 10·log₁₀(N)', calc: (p) => `${(10 * Math.log10(p.N)).toFixed(1)} dB` },
  },

  groups: [
    { title: 'Impulsion', params: ['shape', 'N'] },
    { title: 'Canal', params: ['snr', 'tau'] },
    { title: 'Monte Carlo', params: ['M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // the pulse is invisible in the raw signal — that is the whole point
    view(
      'signals',
      'Signal reçu',
      line('received', {
        width: 1.4,
        label: 'r[n] (reçu)',
        overlays: [line('pulseClean', { color: '#D95319', width: 2.2, label: 's[n−τ] (vérité)' })],
        axes: { x: 'n', y: 'amplitude' },
      })
    ),

    // the correlator output: the peak rises exactly at τ
    view(
      'correlator',
      'Sortie du corrélateur',
      line('corrNoisy', {
        width: 2,
        label: 'y[k] (bruité)',
        overlays: [
          line('corrClean', { color: '#D95319', width: 2, dashed: true, label: 'sans bruit' }),
          vline((p) => p.tau, { color: '#EDB120', dashed: true, width: 2, label: 'τ' }),
          vline('tauHat', { color: '#7E2F8E', width: 1.8, label: 'τ̂' }),
        ],
        axes: { x: 'retard k', y: 'y[k]' },
      })
    ),

    // the processing gain: +3 dB per doubling of N, whatever the shape
    view(
      'processing',
      'Gain de traitement',
      line('gainTheory', {
        color: '#7E2F8E',
        width: 2.4,
        label: '10·log₁₀(N·SNR)',
        overlays: [scatter('gainEmp', { color: '#D95319', size: 5, label: 'Monte Carlo' })],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'SNR en sortie', unit: 'dB' } },
      })
    ),
  ],
};
