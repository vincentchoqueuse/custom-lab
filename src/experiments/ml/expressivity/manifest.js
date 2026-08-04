import { float, int, select } from '../../../core/fields.js';
import { view, figure, line, stem } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'expressivity',
  order: 2,
  random: true, // les poids sont tirés
  title: 'Expressive power',
  subtitle: 'Two layers, random weights — and what the structure of the matrix decides',
  tags: ['networks', 'linear layer', 'convolution', 'Toeplitz', 'weight sharing'],

  params: {
    structure: select('structure', {
      description: 'structure of the layer matrix',
      options: [
        { value: 'dense', label: 'dense — N² independent weights' },
        { value: 'toeplitz', label: 'Toeplitz — a convolution' },
      ],
      default: 'toeplitz',
    }),
    act: select('σ', {
      description: 'activation between the two layers',
      options: [
        { value: 'identity', label: 'identity — none' },
        { value: 'relu', label: 'ReLU' },
        { value: 'tanh', label: 'tanh' },
        { value: 'gelu', label: 'GELU' },
      ],
      default: 'relu',
    }),
    kernel: int('L', {
      description: 'kernel length (Toeplitz structure)',
      min: 1,
      max: 33,
      default: 9,
      visibleIf: { structure: 'toeplitz' },
    }),
    scale: float('α', {
      description: 'scale of the weights',
      min: 0.2,
      max: 4,
      step: 0.1,
      default: 1.5,
      precision: 1,
    }),
    signal: select('entrée', {
      description: 'signal fed to the network',
      options: [
        { value: 'sine', label: 'sinusoid (8 Hz)' },
        { value: 'two', label: 'two tones (6 + 20 Hz)' },
        { value: 'pulse', label: 'impulse' },
        { value: 'noise', label: 'white noise' },
      ],
      default: 'sine',
    }),
  },

  groups: [
    { title: 'Layer', params: ['structure', 'kernel', 'scale'] },
    { title: 'Network', params: ['act'] },
    { title: 'Input', params: ['signal'] },
  ],

  views: [
    // Ce que le réseau FAIT au signal, avec son propre témoin : la même
    // architecture sans activation. L'écart entre les deux courbes EST le
    // pouvoir que l'activation ajoute — nul quand σ = identité, et le
    // constater est la moitié de l'expérience.
    figure(
      'time',
      line('xTime', {
        color: '#7E2F8E',
        width: 1.4,
        opacity: 0.7,
        label: 'input',
        overlays: [
          line('yTime', { color: '#0072BD', width: 2, label: 'network output' }),
          line('yLinTime', { color: '#a1a1aa', width: 1.4, dashed: true, label: 'without activation' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: { label: 'amplitude' } },
      })
    ),

    // Le spectre, où la structure se trahit : Toeplitz FILTRE (le spectre
    // d'entrée multiplié par |H|), dense mélange tout.
    figure(
      'spectrum',
      line('specOut', {
        color: '#0072BD',
        width: 1.6,
        label: 'output',
        overlays: [
          line('specIn', { color: '#7E2F8E', width: 1.4, opacity: 0.55, label: 'input' }),
          line('response', { color: '#D95319', width: 1.8, label: '|H(f)| of the kernel' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: 'amplitude', unit: 'dB', domain: [-60, 3] },
        },
      })
    ),

    // LA vue qui explique le mot « partage de poids » : deux lignes de la
    // matrice, prises à deux endroits. Denses, elles n'ont rien en commun ;
    // Toeplitz, c'est la MÊME, décalée. Il n'y a rien d'autre à comprendre.
    view(
      'rows',
      'Two rows of W₁',
      stem('row', {
        color: '#0072BD',
        size: 3,
        label: 'row 8',
        overlays: [stem('rowMid', { color: '#D95319', size: 3, label: 'row 64' })],
        legend: 'left',
        axes: { x: { label: 'column j' }, y: { label: 'W₁[i, j]' } },
      })
    ),
  ],
};
