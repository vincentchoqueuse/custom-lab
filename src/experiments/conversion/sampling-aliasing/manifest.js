import { float, select } from '../../../core/fields.js';
import { view, line, stem, scatter, vline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'sampling-aliasing',
  order: 2,
  title: 'Sampling & aliasing',
  subtitle: 'Shannon live: below Fs/2 all is well, above it frequencies fold back',
  tags: ['analog', 'digital', 'sampling', 'aliasing', 'Shannon', 'Nyquist'],

  params: {
    source: select('source', {
      description: 'continuous signal being sampled',
      options: [
        { value: 'sine', label: 'sinusoid' },
        { value: 'square', label: 'square wave' },
      ],
      default: 'sine',
    }),
    f: float('f', { description: 'signal frequency', min: 0.5, max: 45, step: 0.5, default: 5, unit: 'Hz' }),
    Fs: float('Fs', { description: 'sampling rate', min: 5, max: 100, step: 1, default: 50, unit: 'Hz' }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    nyquist: { label: 'Fs/2 (Nyquist)', calc: (p) => `${(p.Fs / 2).toFixed(1)} Hz` },
    zone: { label: 'Shannon condition', calc: (p) => (p.f < p.Fs / 2 ? 'met' : 'VIOLATED') },
  },

  groups: [
    { title: 'Signal', params: ['source', 'f'] },
    { title: 'Sampling', params: ['Fs'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // continuous truth, its samples, and what the samples let us rebuild
    figure(
      'time',
      line('continuous', {
        width: 2,
        label: 'continuous signal',
        overlays: [
          line('reconstructed', { color: '#D95319', width: 2.4, label: 'reconstructed (sinc)' }),
          stem('sampled', { color: '#7E2F8E', size: 3.4, label: 'samples' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),

    // true line spectrum vs its folded image in the first Nyquist zone
    figure(
      'spectrum',
      stem('specTrue', {
        color: '#0072BD',
        opacity: 0.8,
        label: 'true lines',
        overlays: [
          stem('specAlias', { color: '#D95319', opacity: 0.8, label: 'after aliasing' }),
          vline((p) => p.Fs / 2, { color: '#EDB120', dashed: true, width: 2, label: 'Fs/2' }),
        ],
        axes: { x: { label: 'f', unit: 'Hz' }, y: 'amplitude' },
      })
    ),

    // the folding diagram: apparent frequency vs true frequency at this Fs
    view(
      'folding',
      'Apparent frequency',
      line('foldCurve', {
        color: '#7E2F8E',
        width: 2.4,
        label: 'apparent f',
        overlays: [
          line('diagonal', { color: '#a1a1aa', width: 1.3, dashed: true, label: 'without aliasing' }),
          scatter('currentPoint', { color: '#EDB120', size: 6.5, label: 'current point' }),
          vline((p) => p.Fs / 2, { color: '#EDB120', dashed: true, width: 1.6, label: 'Fs/2' }),
        ],
        axes: { x: { label: 'true f', unit: 'Hz' }, y: { label: 'apparent f', unit: 'Hz' } },
      })
    ),
  ],
};
