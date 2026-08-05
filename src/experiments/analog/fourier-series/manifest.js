import { float, int, select } from '../../../core/fields.js';
import { view, line, stem, vline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'fourier-series',
  order: 3,
  title: 'Fourier series',
  subtitle:
    'Rebuilding a signal harmonic by harmonic — envelope, Gibbs and duty cycle',
  tags: ['analog', 'Fourier', 'harmonics', 'spectrum', 'Gibbs', 'pulse train'],

  params: {
    wave: select('signal', {
      description: 'periodic waveform',
      options: [
        { value: 'square', label: 'square' },
        { value: 'triangle', label: 'triangle' },
        { value: 'sawtooth', label: 'sawtooth' },
        { value: 'pulse', label: 'pulse train' },
      ],
      default: 'square',
    }),
    N: int('N', { description: 'number of harmonics kept', min: 1, max: 60, default: 5 }),
    A: float('A', { description: 'amplitude', min: 0.2, max: 2, step: 0.05, default: 1 }),
    alpha: float('α', {
      description: 'duty cycle of the pulse train',
      min: 0.05,
      max: 0.95,
      step: 0.01,
      default: 0.25,
      precision: 2,
      visibleIf: { wave: 'pulse' },
    }),
    // no seed here: injected by the core (unused: fully deterministic signal)
  },

  derived: {
    evenHarmonics: {
      label: 'even harmonics',
      calc: (p) =>
        p.wave === 'sawtooth'
          ? 'present'
          : p.wave !== 'pulse'
            ? 'none (half-wave symmetry)'
            : p.alpha === 0.5
              ? 'none (α = 1/2 — this is a square wave)'
              : 'present',
    },
    zeroEnvelope: {
      label: 'zeros of the envelope',
      calc: (p) => (p.wave === 'pulse' ? `n = k/α = ${(1 / p.alpha).toFixed(1)} ; …` : '—'),
    },
  },

  groups: [
    { title: 'Signal', params: ['wave', 'A', 'alpha'] },
    { title: 'Truncation', params: ['N'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // The reconstruction converging onto the ideal signal — Gibbs included.
    figure(
      'time',
      line('ideal', {
        width: 2,
        label: 'signal',
        overlays: [
          line('reconstruction', { color: '#D95319', width: 2.4, label: 'partial sum (N)' }),
        ],
        axes: { x: { label: 't', unit: 'T' }, y: 'x(t)' },
      })
    ),

    // The amplitude spectrum of the kept harmonics, and the envelope they
    // sample — a sinc for the pulse train, a 1/n or 1/n² hyperbola otherwise.
    figure(
      'spectrum',
      stem('spectrum', {
        color: '#0072BD',
        opacity: 0.85,
        overlays: [
          line('envelope', { color: '#D95319', width: 2, label: 'envelope' }),
        ],
        axes: { x: 'n (rang de l\'harmonique)', y: 'amplitude de l\'harmonique' },
      })
    ),

    // Truncation error vs N in log-log: the slope IS the smoothness.
    view(
      'convergence',
      'Error vs N',
      line('errorVsN', {
        color: '#7E2F8E',
        width: 2.2,
        label: 'RMS error (Parseval)',
        overlays: [vline('currentN', { color: '#EDB120', dashed: true, width: 2, label: 'N' })],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'RMS error', scale: 'log' } },
      })
    ),
  ],
};
