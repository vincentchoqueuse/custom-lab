import { float, int, select } from '../../../core/fields.js';
import { view, line, vline, hline } from '../../../core/views.js';
import { timeView, impulseView } from '../../../core/filter-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'fir-design',
  order: 4,
  title: 'Design RIF par fenêtrage',
  subtitle: 'Tronquer, fenêtrer, retarder — le design RIF en trois gestes',
  tags: ['numérique', 'RIF', 'FIR', 'fenêtrage', 'Gibbs', 'phase linéaire'],

  params: {
    fc: float('f_c', {
      description: 'fréquence de coupure (Fs = 8 kHz)',
      min: 200,
      max: 3500,
      step: 10,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    N: int('N', {
      description: 'nombre de coefficients (impair : type I, phase linéaire)',
      min: 5,
      max: 101,
      step: 2,
      default: 21,
    }),
    win: select('fenêtre', {
      description: 'fenêtre appliquée à la troncature',
      options: [
        { value: 'rect', label: 'rectangulaire (troncature brute)' },
        { value: 'hann', label: 'Hann' },
        { value: 'hamming', label: 'Hamming' },
        { value: 'blackman', label: 'Blackman' },
      ],
      default: 'rect',
    }),
  },

  derived: {
    delay: { label: 'retard (N−1)/2', calc: (p) => `${(p.N - 1) / 2} échantillons` },
  },

  views: [
    timeView({ id: 'signal' }),
    impulseView({
      source: 'taps',
      label: 'h[n] (N coefficients)',
      overlays: [
        line('idealIR', { color: '#D95319', dashed: true, label: 'sinc idéal (infini)' }),
        vline((p) => (p.N - 1) / 2, { color: '#EDB120', dashed: true, label: '(N−1)/2' }),
      ],
    }),

    // hand-written: this experiment reads its own |H| against a sidelobe
    // level, with no input/output spectra to compare
    view(
      'response',
      'Réponse fréquentielle',
      line('response', {
        width: 1.8,
        overlays: [
          hline('sidelobe', { color: '#D95319', dashed: true, label: 'lobe max' }),
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
