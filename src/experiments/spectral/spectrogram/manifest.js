import { float, select } from '../../../core/fields.js';
import { view, custom, figure, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'spectrogram',
  order: 5,
  title: 'Spectrogramme',
  subtitle: 'Voir le temps ET la fréquence — au prix du compromis de Gabor',
  tags: ['numérique', 'STFT', 'temps-fréquence', 'chirp', 'Gabor'],

  params: {
    source: select('source', {
      description: 'signal analysé',
      options: [
        { value: 'chirp', label: 'chirp linéaire' },
        { value: 'tones', label: 'deux tons proches' },
        { value: 'am', label: 'AM (battement)' },
        { value: 'fm', label: 'chirp + sinusoïde modulée en fréquence' },
      ],
      default: 'chirp',
    }),
    N: select('N', {
      description: 'longueur de fenêtre (Fs = 2 kHz) — LE compromis',
      options: [
        { value: 64, label: '64' },
        { value: 128, label: '128' },
        { value: 256, label: '256' },
        { value: 512, label: '512' },
        { value: 1024, label: '1024' },
      ],
      default: 256,
    }),
    win: select('fenêtre', {
      description: "fenêtre d'analyse",
      options: [
        { value: 'hann', label: 'Hann' },
        { value: 'rect', label: 'rectangulaire' },
      ],
      default: 'hann',
    }),
    f1: float('f₁', {
      description: 'fréquence finale du chirp (Nyquist = 1000 Hz)',
      min: 200,
      max: 3000,
      step: 10,
      default: 900,
      unit: 'Hz',
      precision: 0,
      visibleIf: { source: ['chirp', 'fm'] },
    }),
    df: float('Δf', {
      description: 'écart entre les deux tons (300 Hz et 300 + Δf)',
      min: 5,
      max: 100,
      step: 1,
      default: 15,
      unit: 'Hz',
      precision: 0,
      visibleIf: { source: 'tones' },
    }),
    fm: float('f_m', {
      description: 'fréquence de modulation AM (porteuse 400 Hz)',
      min: 2,
      max: 30,
      step: 0.5,
      default: 8,
      unit: 'Hz',
      precision: 1,
      visibleIf: { source: 'am' },
    }),
    fmod: float('f_mod', {
      description: 'fréquence de la modulation de fréquence (lente)',
      min: 0.2,
      max: 5,
      step: 0.1,
      default: 1,
      unit: 'Hz',
      precision: 1,
      visibleIf: { source: 'fm' },
    }),
    fdev: float('Δ', {
      description: 'excursion en fréquence de la sinusoïde modulée',
      min: 20,
      max: 400,
      step: 10,
      default: 150,
      unit: 'Hz',
      visibleIf: { source: 'fm' },
    }),
    tcut: float('t', {
      description: 'instant de la coupe spectrale et du zoom temporel',
      min: 0,
      max: 2,
      step: 0.02,
      default: 1,
      unit: 's',
      precision: 2,
    }),
  },

  groups: [
    { title: 'Signal', params: ['source', 'f1', 'df', 'fm', 'fmod', 'fdev'] },
    { title: 'Analyse', params: ['N', 'win', 'tcut'] },
  ],

  views: [
    // CUSTOM view: a time-frequency matrix fits no generic SVG type — see the
    // justification comment in views/Spectrogram.svelte (canvas-rasterized,
    // embedded as an SVG <image> so freeze/export keep working).
    custom('map', 'Spectrogramme', () => import('./views/Spectrogram.svelte')),

    // The two readings the map exists to improve on, under the catalogue's
    // own names so they are recognised for what they are — the same
    // "Signal temporel" and the same "Spectre" as everywhere else in
    // analyse spectrale. They are not decoration: a chirp and the same tones
    // played backwards have the SAME spectrum, and the time plot says when
    // without saying what. Showing both next to the map is the argument for
    // the STFT; the map alone is only its conclusion.
    figure(
      'time',
      line('signal', {
        width: 1.2,
        label: 'x(t)',
        overlays: [vline('tCut', { color: '#EDB120', dashed: true, width: 1.8, label: 't' })],
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),

    figure(
      'spectrum',
      line('spectrum', {
        width: 1.6,
        label: '|X(f)| sur les 2 s',
        overlays: [vline('nyquist', { color: '#EDB120', dashed: true, label: 'Fs/2' })],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|X(f)|', unit: 'dB', domain: [-80, 5] },
        },
      })
    ),

    view(
      'slice',
      'Coupe à t',
      line('slice', {
        overlays: [vline('nyquist', { color: '#EDB120', dashed: true, label: 'Fs/2' })],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|X(t, f)|', unit: 'dB', domain: [-80, 5] },
        },
      })
    ),
    view(
      'zoom',
      'Signal autour de t',
      line('zoom', {
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),
  ],
};
