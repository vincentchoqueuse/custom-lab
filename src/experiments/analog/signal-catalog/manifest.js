import { float, select } from '../../../core/fields.js';
import { view, line, hline, vline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'signal-catalog',
  order: 1,
  title: 'Catalogue de signaux',
  subtitle: 'Sept signaux, sept transformées de Fourier — amplitude, dB et phase',
  tags: ['analogique', 'Fourier', 'transformée', 'spectre', 'catalogue'],

  params: {
    signal: select('signal', {
      description: 'signal du catalogue',
      options: [
        { value: 'rect', label: 'porte Π(t/T)' },
        { value: 'triangle', label: 'triangle Λ(t/T)' },
        { value: 'gauss', label: 'gaussienne e^(−π(t/T)²)' },
        { value: 'expo', label: 'exponentielle causale e^(−t/T)·u(t)' },
        { value: 'expo2', label: 'exponentielle bilatérale e^(−|t|/T)' },
        { value: 'sinc', label: 'sinus cardinal sinc(t/T)' },
        { value: 'rf', label: 'sinusoïde tronquée cos(2πf₀t)·Π(t/T)' },
      ],
      default: 'rect',
    }),
    T: float('T', {
      description: 'durée caractéristique',
      min: 1,
      max: 20,
      step: 0.5,
      default: 5,
      unit: 'ms',
      precision: 1,
    }),
    f0: float('f₀', {
      description: 'fréquence de la sinusoïde tronquée',
      min: 200,
      max: 2000,
      step: 10,
      default: 600,
      unit: 'Hz',
      precision: 0,
      visibleIf: { signal: 'rf' },
    }),
    t0: float('t₀', {
      description: 'retard du signal',
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
      'Spectre en dB',
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
