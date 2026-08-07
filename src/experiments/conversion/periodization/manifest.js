import { float, select } from '../../../core/fields.js';
import { view, line, scatter, vline, stem, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'periodization',
  order: 1,
  title: 'What sampling does to a spectrum',
  subtitle: 'The spectrum repeats every Fs — and aliasing is the sum of the copies',
  tags: ['analog', 'digital', 'sampling', 'periodization', 'Poisson', 'Shannon'],

  doc: `What the samples know, answered in frequency. The spectrum of a sampled
signal is not X(f): it is X(f) plus its copies shifted by every multiple of
Fs. At a high rate the copies are far away and the central one untouched;
lowering Fs does not shrink the spectrum — it moves the copies closer, until
they bite into the central copy and ADD to it. Aliasing is not a mysterious
deformation, it is a sum, and the statline measures the in-band error it
causes.

Two dials fight the overlap from opposite sides: raising Fs separates the
copies, widening the signal in time narrows its spectrum — the same trade
seen twice. The sinc is the special case that settles the theory: its
spectrum is rectangular, stopping dead, so above twice that edge the copies
do not touch at all and the error is EXACTLY zero — Shannon's theorem shown
rather than recited, and the only one of the four sources to achieve it,
the others having infinite tails.

The last scene proves the picture is not a drawing. The transform of the
samples themselves, Σ x(nTs)·e^(−j2πf nTs), computed without ever using
X(f), lands exactly on the sum of the copies: the Poisson summation
formula, which is the whole theorem in one sentence — sampling in time is
periodizing in frequency.`,


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
    fs: float('Fs', {
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
          stem('samples', { color: '#0072BD', size: 2.8, opacity: 0.95, label: 'x(nTs)' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: 'x(t)' },
      })
    ),
    // THE view: the copies, their sum, and what the samples actually know
    view(
      'periodize',
      'Periodization of the spectrum',
      line('periodized', {
        width: 2.6,
        label: 'sampled spectrum = Σ copies',
        overlays: [
          line('copies', { color: '#a1a1aa', dashed: true, label: 'copies X(f − k·Fs)' }),
          line('central', { color: '#D95319', dashed: true, width: 2, label: 'original X(f)' }),
          scatter('dtft', { color: '#77AC30', size: 1.8, opacity: 0.9, label: 'DTFT of the samples' }),
          vline('feHalf', { color: '#EDB120', dashed: true, label: 'Fs/2' }),
          vline('feHalfNeg', { color: '#EDB120', dashed: true }),
        ],
        axes: { x: { label: 'f', unit: 'Hz' }, y: '|X|' },
      })
    ),
    view(
      'error',
      'Aliasing vs Fs',
      line('errVsFs', {
        width: 2.2,
        overlays: [vline('fs', { color: '#EDB120', dashed: true, label: 'Fs' })],
        axes: {
          x: { label: 'Fs', unit: 'Hz' },
          y: { label: 'in-band error', unit: '%' },
        },
      })
    ),
  ],
};
