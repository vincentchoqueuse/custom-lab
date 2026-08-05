import { float, int, select } from '../../../core/fields.js';
import { line, vline, hline } from '../../../core/views.js';
import { timeView, impulseView, spectrumView } from '../../../core/response-views.js';

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
    win: select('window', {
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
    delay: { label: 'delay (N−1)/2', calc: (p) => `${(p.N - 1) / 2} samples` },
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

    // The module's figure, with this experiment's own reading on top: the peak
    // stop-band lobe. It used to be |H| alone — the level was readable and the
    // consequence was not. With the square wave's harmonics under it, a lobe at
    // −21 dB stops being a number about a curve and becomes the harmonics that
    // survived it, which is what a filter is judged on.
    spectrumView({
      domain: [-100, 10],
      overlays: [
        hline('sidelobe', { color: '#EDB120', dashed: true, label: 'peak lobe' }),
        vline('fc', { color: '#EDB120', dashed: true, label: 'f_c' }),
      ],
    }),
  ],
};
