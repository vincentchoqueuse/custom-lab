import { float, int, log, select } from '../../../core/fields.js';
import { view, line, histogram, scatter, vline, hline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'eye-diagram',
  order: 3,
  random: true,
  title: 'The eye diagram',
  subtitle: 'ISI, noise and sampling instant — the health of a link at a glance',
  tags: ['eye diagram', 'ISI', 'raised cosine', 'Nyquist', 'PAM'],

  params: {
    levels: select('M', {
      description: 'number of PAM levels',
      options: [
        { value: 2, label: '2-PAM (±1)' },
        { value: 4, label: '4-PAM (two bits/symbol)' },
      ],
      default: 2,
    }),
    alpha: float('α', {
      description: 'roll-off of the raised cosine',
      min: 0.05,
      max: 1,
      step: 0.05,
      default: 0.35,
      precision: 2,
    }),
    bt: log('B·T', {
      description: 'channel bandwidth (normalized to the symbol rate)',
      min: 0.2,
      max: 8,
      default: 8,
    }),
    sigma: float('σ', { description: 'noise at the receiver', min: 0, max: 0.4, step: 0.01, default: 0.02 }),
    Nsym: int('N', {
      description: 'number of symbols superimposed',
      min: 50,
      max: 1000,
      step: 50,
      default: 200,
    }),
    // no seed here: injected by the core
  },

  groups: [
    { title: 'Transmitter', params: ['levels', 'alpha'] },
    { title: 'Channel', params: ['bt', 'sigma'] },
    { title: 'Observation', params: ['Nsym'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // THE SIGNAL FIRST, as everywhere in the subject — and here it is also the
    // only order the eye makes sense in. The eye is this waveform cut into 2T
    // slices and laid on top of itself; shown first, it is a picture with no
    // provenance, and a room asked to accept one before the other has to take
    // the construction on trust.
    figure(
      'time',
      line('waveform', {
        width: 1.8,
        label: 'received signal',
        overlays: [
          scatter('samplePoints', { color: '#D95319', size: 4.5, label: 'samples at kT' }),
        ],
        axes: { x: 't/T', y: 'x(t)' },
      })
    ),

    // all 2T slices overlaid — one NaN-broken series drawn by the generic
    // Line; the ±1/3 level guides only exist in 4-PAM (NaN hides them)
    view(
      'eye',
      'Eye diagram',
      line('eyeTraces', {
        width: 1.1,
        opacity: 0.28,
        overlays: [
          vline(() => 1, { color: '#EDB120', dashed: true, width: 2, label: 'optimal instant' }),
          hline(() => 1, { color: '#a1a1aa', width: 1, dashed: true }),
          hline(() => -1, { color: '#a1a1aa', width: 1, dashed: true }),
          hline((p) => (p.levels === 4 ? 1 / 3 : NaN), { color: '#a1a1aa', width: 1, dashed: true }),
          hline((p) => (p.levels === 4 ? -1 / 3 : NaN), { color: '#a1a1aa', width: 1, dashed: true }),
        ],
        axes: { x: 't/T', y: 'x(t)' },
      })
    ),

    // the vertical cut at the sampling instant: clusters around the levels
    view(
      'at-sample',
      'At the sampling instant',
      histogram('sampleValues', {
        color: '#0072BD',
        opacity: 0.6,
        overlays: [
          vline(() => 1, { color: '#EDB120', dashed: true, width: 1.6 }),
          vline(() => -1, { color: '#EDB120', dashed: true, width: 1.6 }),
          vline((p) => (p.levels === 4 ? 1 / 3 : NaN), { color: '#EDB120', dashed: true, width: 1.6 }),
          vline((p) => (p.levels === 4 ? -1 / 3 : NaN), { color: '#EDB120', dashed: true, width: 1.6 }),
        ],
        axes: { x: 'sampled value', y: 'density' },
      })
    ),
  ],
};
