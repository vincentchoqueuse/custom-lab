import { float, int, select } from '../../../core/fields.js';
import { view, line, vline, hline, figure } from '../../../core/views.js';
import { timeView, impulseView } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'fir-design',
  order: 4,
  title: 'FIR design by windowing',
  subtitle: 'Truncate, window, delay — FIR design in three moves',
  tags: ['digital', 'FIR', 'windowing', 'Gibbs', 'linear phase'],

  params: {
    fc: float('f_c', {
      description: 'cutoff frequency (Fs = 8 kHz)',
      min: 200,
      max: 3500,
      step: 10,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    N: int('N', {
      description: 'number of coefficients (odd: type I, linear phase)',
      min: 5,
      max: 101,
      step: 2,
      default: 21,
    }),
    win: select('fenêtre', {
      description: 'window applied to the truncation',
      options: [
        { value: 'rect', label: 'rectangular (raw truncation)' },
        { value: 'hann', label: 'Hann' },
        { value: 'hamming', label: 'Hamming' },
        { value: 'blackman', label: 'Blackman' },
      ],
      default: 'rect',
    }),
  },

  derived: {
    delay: { label: 'retard (N−1)/2', calc: (p) => `${(p.N - 1) / 2} samples` },
  },

  views: [
    timeView(),
    impulseView({
      source: 'taps',
      label: 'h[n] (N coefficients)',
      overlays: [
        line('idealIR', { color: '#D95319', dashed: true, label: 'ideal sinc (infinite)' }),
        vline((p) => (p.N - 1) / 2, { color: '#EDB120', dashed: true, label: '(N−1)/2' }),
      ],
    }),

    // hand-written: this experiment reads its own |H| against a sidelobe
    // level, with no input/output spectra to compare
    figure(
      'gain',
      line('response', {
        width: 1.8,
        overlays: [
          hline('sidelobe', { color: '#D95319', dashed: true, label: 'peak lobe' }),
          vline('fc', { color: '#EDB120', dashed: true, label: 'f_c' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|H(f)|', unit: 'dB', domain: [-100, 8] },
        },
      })
    ),
  ],
};
