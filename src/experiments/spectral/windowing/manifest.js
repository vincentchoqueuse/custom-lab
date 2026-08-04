import { float, select } from '../../../core/fields.js';
import { view, line, vline, hline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'windowing',
  order: 2,
  title: 'Spectral windowing',
  subtitle: 'Resolution, leakage and dynamic range — what the window does to the spectrum',
  tags: ['digital', 'DFT', 'window', 'resolution', 'leakage'],

  params: {
    win: select('fenêtre', {
      description: 'observation window',
      options: [
        { value: 'rect', label: 'rectangular' },
        { value: 'hann', label: 'Hann' },
        { value: 'hamming', label: 'Hamming' },
        { value: 'blackman', label: 'Blackman' },
      ],
      default: 'rect',
    }),
    df: float('Δf', {
      description: 'gap between the two lines',
      min: 1,
      max: 50,
      step: 0.5,
      default: 15,
      unit: 'Hz',
      precision: 1,
    }),
    a2: float('A₂', {
      description: 'level of the second line',
      min: -80,
      max: 0,
      step: 1,
      default: -20,
      unit: 'dB',
      precision: 0,
    }),
    N: select('N', {
      description: 'window length (samples, Fs = 1 kHz)',
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
      description: 'zero-padding factor (interpolates, does not resolve)',
      options: [
        { value: 1, label: '×1' },
        { value: 4, label: '×4' },
        { value: 16, label: '×16' },
      ],
      default: 1,
    }),
    f1: float('f₁', {
      description: 'frequency of the first line',
      min: 100,
      max: 400,
      step: 0.5,
      default: 200,
      unit: 'Hz',
      precision: 1,
    }),
  },

  groups: [
    { title: 'Window', params: ['win', 'N', 'pad'] },
    { title: 'Signal', params: ['f1', 'df', 'a2'] },
  ],

  views: [
    figure(
      'time',
      line('signal', {
        overlays: [
          line('envUp', { color: '#D95319', dashed: true, label: 'envelope' }),
          line('envDown', { color: '#D95319', dashed: true }),
        ],
        axes: { x: 'n', y: 'x(n)·w(n)' },
      })
    ),
    figure(
      'spectrum',
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
      'The window under the microscope',
      line('kernel', {
        // Deux traits, et l'écart entre eux est la leçon : ce que le tracé
        // MONTRE, et ce que la théorie DIT pour cette fenêtre à ce N —
        // TFtd en forme close, maximum raffiné par section dorée, jamais
        // une valeur tabulée. Ils ne coïncident pas exactement, et c'est
        // honnête : à 16× de bourrage la grille ne tombe pas sur le sommet
        // du lobe, donc la lecture passe légèrement en dessous. La statline
        // chiffre l'écart.
        overlays: [
          hline('sidelobe', { color: '#D95319', dashed: true, width: 1.8, label: 'measured' }),
          hline('sidelobeTheoryLine', { color: '#7E2F8E', dashed: true, width: 1.8, label: 'theory' }),
          // et OÙ la théorie place ce sommet : avec le niveau, cela fait une
          // croix sur le lobe. Les deux traits horizontaux se confondent dès
          // que la lecture est bonne — ce qui est le cas visé, donc un
          // repère qui ne dépend pas de leur écart est nécessaire.
          vline('sidelobeBinLine', { color: '#7E2F8E', dashed: true, width: 1.2 }),
        ],
        axes: {
          x: { label: 'offset from the line', unit: 'bins (Fs/N)' },
          y: { label: '|W(f)|', unit: 'dB', domain: [-100, 5] },
        },
      })
    ),
  ],
};
