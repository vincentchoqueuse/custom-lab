import { float, select } from '../../../core/fields.js';
import { view, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'windowing',
  order: 2,
  title: 'Fenêtrage spectral',
  subtitle: 'Résolution, fuites et dynamique — ce que la fenêtre fait au spectre',
  tags: ['numérique', 'DFT', 'fenêtre', 'résolution', 'leakage'],

  params: {
    win: select('fenêtre', {
      description: "fenêtre d'observation",
      options: [
        { value: 'rect', label: 'rectangulaire' },
        { value: 'hann', label: 'Hann' },
        { value: 'hamming', label: 'Hamming' },
        { value: 'blackman', label: 'Blackman' },
      ],
      default: 'rect',
    }),
    df: float('Δf', {
      description: 'écart entre les deux raies',
      min: 1,
      max: 50,
      step: 0.5,
      default: 15,
      unit: 'Hz',
      precision: 1,
    }),
    a2: float('A₂', {
      description: 'niveau de la seconde raie',
      min: -80,
      max: 0,
      step: 1,
      default: -20,
      unit: 'dB',
      precision: 0,
    }),
    N: select('N', {
      description: "longueur de la fenêtre (échantillons, Fs = 1 kHz)",
      options: [
        { value: 64, label: '64' },
        { value: 128, label: '128' },
        { value: 256, label: '256' },
        { value: 512, label: '512' },
        { value: 1024, label: '1024' },
      ],
      default: 256,
    }),
    pad: select('zero-padding', {
      description: 'facteur de zero-padding (interpole, ne résout pas)',
      options: [
        { value: 1, label: '×1' },
        { value: 4, label: '×4' },
        { value: 16, label: '×16' },
      ],
      default: 1,
    }),
    f1: float('f₁', {
      description: 'fréquence de la première raie',
      min: 100,
      max: 400,
      step: 0.5,
      default: 200,
      unit: 'Hz',
      precision: 1,
    }),
  },

  groups: [
    { title: 'Fenêtre', params: ['win', 'N', 'pad'] },
    { title: 'Signal', params: ['f1', 'df', 'a2'] },
  ],

  views: [
    view(
      'time',
      'Signal fenêtré',
      line('signal', {
        overlays: [
          line('envUp', { color: '#D95319', dashed: true, label: 'enveloppe' }),
          line('envDown', { color: '#D95319', dashed: true }),
        ],
        axes: { x: 'n', y: 'x(n)·w(n)' },
      })
    ),
    view(
      'spectrum',
      'Spectre',
      line('spectrum', {
        overlays: [
          vline('f1', { color: '#EDB120', dashed: true, label: 'f₁' }),
          vline('f2', { color: '#EDB120', dashed: true, label: 'f₂' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|X(f)|', unit: 'dB', domain: [-100, 5] },
        },
      })
    ),

    view(
      'kernel',
      'La fenêtre au microscope',
      line('kernel', {
        overlays: [
          hline('sidelobe', { color: '#D95319', dashed: true, label: 'lobes secondaires' }),
        ],
        axes: {
          x: { label: 'écart à la raie', unit: 'bins (Fs/N)' },
          y: { label: '|W(f)|', unit: 'dB', domain: [-100, 5] },
        },
      })
    ),
  ],
};
