import { float, int, select } from '../../../core/fields.js';
import { view, line, bars, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'fourier-series',
  title: 'Séries de Fourier',
  subtitle: 'Reconstruire un signal harmonique par harmonique — et le phénomène de Gibbs',
  tags: ['Fourier', 'harmoniques', 'spectre', 'Gibbs'],

  params: {
    wave: select('signal', {
      description: 'forme d\'onde périodique',
      options: [
        { value: 'square', label: 'carré' },
        { value: 'triangle', label: 'triangle' },
        { value: 'sawtooth', label: 'dent de scie' },
      ],
      default: 'square',
    }),
    N: int('N', { description: 'nombre d\'harmoniques conservées', min: 1, max: 60, default: 5 }),
    A: float('A', { description: 'amplitude', min: 0.2, max: 2, step: 0.05, default: 1 }),
    // no seed here: injected by the core (unused: fully deterministic signal)
  },

  derived: {
    fondamental: { label: 'harmoniques paires', calc: (p) => (p.wave === 'sawtooth' ? 'présentes' : 'nulles (symétrie)') },
  },

  groups: [
    { title: 'Signal', params: ['wave', 'A'] },
    { title: 'Troncature', params: ['N'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // The reconstruction converging onto the ideal signal — Gibbs included.
    view(
      'time',
      'Reconstruction',
      line('ideal', {
        width: 2,
        label: 'signal',
        overlays: [
          line('reconstruction', { color: '#D95319', width: 2.4, label: 'somme partielle (N)' }),
        ],
        axes: { x: { label: 't', unit: 'T' }, y: 'x(t)' },
      })
    ),

    // The amplitude spectrum of the kept harmonics.
    view(
      'spectrum',
      'Spectre',
      bars('spectrum', {
        color: '#0072BD',
        opacity: 0.85,
        axes: { x: 'n (rang de l\'harmonique)', y: '|bₙ|' },
      })
    ),

    // Truncation error vs N in log-log: the slope IS the smoothness.
    view(
      'convergence',
      'Erreur vs N',
      line('errorVsN', {
        color: '#7E2F8E',
        width: 2.2,
        label: 'erreur RMS (Parseval)',
        overlays: [vline('currentN', { color: '#EDB120', dashed: true, width: 2, label: 'N' })],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'erreur RMS', scale: 'log' } },
      })
    ),
  ],
};
