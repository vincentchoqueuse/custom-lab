import { float, select } from '../../../core/fields.js';
import { view, line, vline, hline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'windowing',
  order: 2,
  title: 'Spectral windowing',
  subtitle: 'Resolution, leakage and dynamic range — what the window does to the spectrum',
  tags: ['digital', 'DFT', 'window', 'resolution', 'leakage'],

  doc: `A pure frequency does not give a pure spectrum, because only N samples are
observed: the line is a peak of width Fs/N, and that width belongs to the
observation, not to the signal. Two questions follow, and they are the two
halves of windowing.

Can two close lines be told apart? Below Fs/N a pair merges into one hump,
and zero-padding — the show-of-hands trap — smooths the curve without
splitting it: padding interpolates, it does not invent information. What
resolves is N.

Can a weak line be seen at all? A tone at −45 dB is invisible under the
−13 dB sidelobes of the rectangular window; Hann at −31 dB barely lets it
emerge, Blackman at −58 dB reveals it. The window chooses what one is
ALLOWED to see — and it charges for it: the Hann main lobe is twice as
wide, so at Δf = 6 Hz the rectangular window separates two equal lines that
Hann merges. A wide main lobe with low sidelobes, or the converse, never
both: all of windowing is that one trade-off.`,


  params: {
    win: select('window', {
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
        label: 'windowed signal',
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
        // Two strokes, and the gap between them is the lesson: what the plot
        // SHOWS, and what the theory SAYS for this window at this N — a
        // closed-form DTFT, maximum refined by golden section, never a tabulated
        // value. They do not coincide exactly, and that is honest: at 16×
        // zero-padding the grid does not fall on the top of the lobe, so the
        // reading passes slightly below. The statline gives the gap a number.
        overlays: [
          hline('sidelobe', { color: '#D95319', dashed: true, width: 1.8, label: 'measured' }),
          hline('sidelobeTheoryLine', { color: '#7E2F8E', dashed: true, width: 1.8, label: 'theory' }),
          // and WHERE the theory places that peak: together with the level, it
          // makes a cross on the lobe. The two horizontal strokes coincide as
          // soon as the reading is good — which is the intended case, so a
          // marker that does not depend on their gap is necessary.
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
