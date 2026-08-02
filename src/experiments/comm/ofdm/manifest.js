import { float, int, select } from '../../../core/fields.js';
import { view, plane, line, scatter } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'ofdm',
  title: 'OFDM et canal sélectif',
  subtitle: 'Le canal creuse des trous ; la FFT le rend plat, porteuse par porteuse',
  tags: ['OFDM', 'multitrajets', 'préfixe cyclique', 'égalisation'],

  params: {
    Nc: select('N', {
      description: 'nombre de sous-porteuses',
      options: [
        { value: 16, label: '16' },
        { value: 32, label: '32' },
        { value: 64, label: '64' },
        { value: 128, label: '128' },
      ],
      default: 64,
    }),
    L: int('L', {
      description: 'longueur du canal multitrajets (échantillons)',
      min: 1,
      max: 12,
      default: 6,
    }),
    cp: int('L_cp', {
      description: 'longueur du préfixe cyclique (doit couvrir L − 1)',
      min: 0,
      max: 16,
      default: 8,
    }),
    snr: float('SNR', {
      description: 'rapport signal à bruit par sous-porteuse',
      min: 0,
      max: 30,
      step: 0.5,
      default: 15,
      unit: 'dB',
      precision: 1,
    }),
    M: int('M', {
      description: 'nombre de symboles OFDM simulés',
      min: 10,
      max: 200,
      default: 50,
    }),
  },

  derived: {
    cpOk: {
      label: 'préfixe suffisant ?',
      calc: (p) => (p.cp >= p.L - 1 ? 'oui (L_cp ≥ L−1)' : 'NON — ISI'),
    },
  },

  groups: [
    { title: 'Canal', params: ['L', 'snr'] },
    { title: 'OFDM', params: ['Nc', 'cp', 'M'] },
  ],

  views: [
    view(
      'channel',
      'Le canal vu des porteuses',
      line('channel', {
        width: 2,
        axes: {
          x: 'sous-porteuse k',
          y: { label: '|H_k|²', unit: 'dB', domain: [-40, 12] },
        },
      })
    ),
    plane('constellation', 'Constellation', {
      clouds: [
        { source: 'rxRaw', color: '#7E2F8E', r: 1.5, opacity: 0.18, label: 'avant égalisation' },
        { source: 'rxEq', color: '#0072BD', r: 1.7, opacity: 0.4, label: 'après ZF (1 coeff/porteuse)' },
      ],
      markers: { source: 'ideal', color: '#EDB120', label: 'QPSK idéale' },
      minHalf: 1.6,
      maxHalf: 2.5,
    }),
    view(
      'ber',
      'Erreurs par porteuse',
      scatter('berMeasured', {
        size: 3,
        opacity: 0.85,
        label: 'BER mesuré',
        overlays: [
          line('berTheory', { color: '#D95319', width: 2, label: 'Q(√(|H_k|²·SNR))' }),
        ],
        axes: { x: 'sous-porteuse k', y: 'BER' },
      })
    ),
  ],
};
