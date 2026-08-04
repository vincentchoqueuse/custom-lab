import { float, select } from '../../../core/fields.js';
import { view, line, scatter, vline, stem, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'periodization',
  order: 1,
  title: 'What sampling does to a spectrum',
  subtitle: 'The spectrum repeats every Fe — and aliasing is the sum of the copies',
  tags: ['analog', 'digital', 'sampling', 'periodization', 'Poisson', 'Shannon'],

  params: {
    signal: select('signal', {
      description: 'source (transform known in closed form)',
      options: [
        { value: 'gauss', label: 'Gaussian' },
        { value: 'triangle', label: 'triangle' },
        { value: 'sinc', label: 'sinc (band-limited)' },
        { value: 'expo', label: 'exponential e^−|t|/τ' },
      ],
      default: 'gauss',
    }),
    fe: float('Fe', {
      description: 'sampling rate',
      min: 60,
      max: 700,
      step: 5,
      default: 600,
      unit: 'Hz',
      precision: 0,
    }),
    tau: float('τ', {
      description: 'time width of the signal',
      min: 2,
      max: 12,
      step: 0.5,
      default: 5,
      unit: 'ms',
      precision: 1,
    }),
  },

  views: [
    figure(
      'time',
      line('xt', {
        color: '#D95319',
        width: 2,
        label: 'x(t)',
        overlays: [
          stem('samples', { color: '#0072BD', size: 2.8, opacity: 0.95, label: 'x(nTe)' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: 'x(t)' },
      })
    ),
    // THE view: the copies, their sum, and what the samples actually know
    view(
      'periodize',
      'Périodisation du spectre',
      line('periodized', {
        width: 2.6,
        label: 'sampled spectrum = Σ copies',
        overlays: [
          line('copies', { color: '#a1a1aa', dashed: true, label: 'copies X(f − k·Fe)' }),
          line('central', { color: '#D95319', dashed: true, width: 2, label: 'original X(f)' }),
          scatter('dtft', { color: '#77AC30', size: 1.8, opacity: 0.9, label: 'DTFT of the samples' }),
          vline('feHalf', { color: '#EDB120', dashed: true, label: 'Fe/2' }),
          vline('feHalfNeg', { color: '#EDB120', dashed: true }),
        ],
        axes: { x: { label: 'f', unit: 'Hz' }, y: '|X|' },
      })
    ),
    view(
      'error',
      'Repliement vs Fe',
      line('errVsFe', {
        width: 2.2,
        overlays: [vline('fe', { color: '#EDB120', dashed: true, label: 'Fe' })],
        axes: {
          x: { label: 'Fe', unit: 'Hz' },
          y: { label: 'in-band error', unit: '%' },
        },
      })
    ),
  ],
};
