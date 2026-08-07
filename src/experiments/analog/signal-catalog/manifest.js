import { float, select } from '../../../core/fields.js';
import { view, line, hline, vline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'signal-catalog',
  order: 1,
  title: 'A catalogue of signals',
  subtitle: 'Seven signals, seven Fourier transforms — magnitude, dB and phase',
  tags: ['analog', 'Fourier', 'transform', 'spectrum', 'catalogue'],

  doc: `Seven canonical signals and their transforms, visited one by one — an atlas
rather than an argument. Sorted by eye they make three families: those that
stop (gate, triangle), those that decay without ever reaching zero (Gaussian,
exponentials), and the one that lingers (sinc); the question the atlas keeps
asking is which of them buys the narrowest spectrum for a given duration.

The gate and the cardinal sine are the basic pair, first zero at 1/T — and
doubling the duration halves the lobe, not the reverse. With the axes locked
the product T·B₃ does not change by a digit as T moves: the scaling theorem,
demonstrated rather than stated. The Gaussian is the fixed point — the same
shape on both sides, no sidelobes and no zeros, the only signal here for
which that is true — and the dB view separates it sharply from the gate,
which lingers at −13.3 dB where the triangle, a sinc squared, sits at
−26.5 dB: already the whole idea of windowing.

Two more theorems close the tour. A delay changes the magnitude spectrum by
not one pixel — it lives entirely in the phase, as a slope of −2πt₀ — so a
magnitude spectrum alone cannot say WHEN. And the gate times a cosine moves
its lobe to ±f₀ without deforming it: modulating is shifting the spectrum.`,


  params: {
    signal: select('signal', {
      description: 'signal from the catalogue',
      options: [
        { value: 'rect', label: 'gate Π(t/T)' },
        { value: 'triangle', label: 'triangle Λ(t/T)' },
        { value: 'gauss', label: 'Gaussian e^(−π(t/T)²)' },
        { value: 'expo', label: 'causal exponential' },
        { value: 'expo2', label: 'two-sided exponential' },
        { value: 'sinc', label: 'cardinal sine' },
        { value: 'rf', label: 'truncated sinusoid' },
      ],
      default: 'rect',
    }),
    T: float('T', {
      description: 'characteristic duration',
      min: 1,
      max: 20,
      step: 0.5,
      default: 5,
      unit: 'ms',
      precision: 1,
    }),
    f0: float('f₀', {
      description: 'frequency of the truncated sinusoid',
      min: 200,
      max: 2000,
      step: 10,
      default: 600,
      unit: 'Hz',
      precision: 0,
      visibleIf: { signal: 'rf' },
    }),
    t0: float('t₀', {
      description: 'delay of the signal',
      min: -8,
      max: 8,
      step: 0.1,
      default: 0,
      unit: 'ms',
      precision: 1,
    }),
    // no seed here: injected by the core (unused: fully deterministic signals)
  },

  derived: {
    invT: { label: '1/T', calc: (p) => `${Math.round(1000 / p.T)} Hz` },
  },

  groups: [
    { title: 'Signal', params: ['signal', 'T', 'f0'] },
    { title: 'Translation', params: ['t0'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    figure(
      'time',
      line('xt', {
        width: 2,
        axes: { x: { label: 't', unit: 'ms' }, y: 'x(t)' },
      })
    ),

    // Amplitude spectrum with the −3 dB level and the two half-width markers:
    // the width of the main lobe is the observable lesson.
    figure(
      'spectrum',
      line('mag', {
        width: 2.2,
        label: '|X(f)|',
        overlays: [
          hline('level3', { color: '#EDB120', dashed: true, label: '|X|max/√2' }),
          vline('bw3p', { color: '#EDB120', dashed: true }),
          vline('bw3n', { color: '#EDB120', dashed: true }),
        ],
        axes: { x: { label: 'f', unit: 'Hz' }, y: '|X(f)|' },
      })
    ),

    // The same magnitude in dB: what the linear plot hides — the sidelobes and
    // their decay rate (−13 dB for the gate, −27 dB for the triangle).
    view(
      'db',
      'Spectrum in dB',
      line('magDb', {
        color: '#7E2F8E',
        width: 2,
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|X(f)| / |X|max', unit: 'dB', domain: [-60, 3] },
        },
      })
    ),

    // Where the delay lives. |X| is untouched; the phase takes a −2πt₀ slope.
    figure(
      'phase',
      line('phase', {
        color: '#D95319',
        width: 2,
        axes: { x: { label: 'f', unit: 'Hz' }, y: { label: 'arg X(f)', unit: 'rad' } },
      })
    ),
  ],
};
