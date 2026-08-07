import { float, select } from '../../../core/fields.js';
import { view, line, stem, scatter, vline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'sampling-aliasing',
  order: 2,
  title: 'Sampling & aliasing',
  subtitle: 'Shannon live: below Fs/2 all is well, above it frequencies fold back',
  tags: ['analog', 'digital', 'sampling', 'aliasing', 'Shannon', 'Nyquist'],

  doc: `A sinusoid, its samples, and the signal a sinc interpolation rebuilds from
the samples alone. Below Fs/2 the reconstruction covers the original
exactly — Shannon's theorem is an equality, not an approximation, and it
stays true with barely more than two points per period, long after the eye
has stopped believing it.

At 45 Hz sampled at 50 the same points trace a 5 Hz signal, and the
reconstruction agrees: two different signals, identical samples. The
information is gone, not merely degraded. This is the wagon wheel of
westerns and the moiré of camera sensors, and the apparent-frequency view
shows f bouncing off Fs/2 as off a wall.

A square wave makes the folding concrete: at 15 Hz its harmonics sit at 45,
75 and 105 Hz, all beyond Fs/2 = 25, and each folds back inside the band —
45 lands on 5, 75 on 25, 105 on 5 again. The reconstruction is no longer a
square wave; it has been contaminated by its own folded harmonics. Hence
the rule that filtering happens BEFORE sampling, never after, and why every
converter carries an anti-aliasing filter.`,


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
