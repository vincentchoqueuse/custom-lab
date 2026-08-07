import { float, select } from '../../../core/fields.js';
import { view, custom, figure, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'spectrogram',
  order: 6,
  title: 'The spectrogram',
  subtitle: 'Seeing time AND frequency — at the price of the Gabor trade-off',
  tags: ['digital', 'STFT', 'time–frequency', 'chirp', 'Gabor'],

  doc: `A window slid along the signal, a spectrum per position, and one map with
time across and frequency up. The window length divides one invariant
between two axes: Δf·Δt = 1, always. A chirp drawn with N = 64 has a sharp
time axis and a blurred frequency axis; N = 1024, the opposite. One does
not choose to be good everywhere, only WHERE to be good — the uncertainty
principle in its signal-processing form.

The scenes make the trade concrete. Two tones 15 Hz apart need about 1/Δf
of listening before they separate — the calculation the ear performs. A
chirp that climbs past Fs/2 BOUNCES, aliasing signing its name in the
time–frequency plane. An AM signal is pulsing columns through a short
window and three steady lines — carrier and sidebands — through a long one:
neither picture is wrong, the same physics projected onto two resolutions.

The last scene is why the spectrogram exists at all: a rising chirp and a
slowly wobbling tone CROSS, which no spectrum can show. And the two ridges
ask for opposite windows in the same image — Gabor again, with no setting
that serves both.`,


  params: {
    source: select('source', {
      description: 'signal analysed',
      options: [
        { value: 'chirp', label: 'linear chirp' },
        { value: 'tones', label: 'two close tones' },
        { value: 'am', label: 'AM (beat)' },
        { value: 'fm', label: 'chirp + FM sinusoid' },
      ],
      default: 'chirp',
    }),
    N: select('N', {
      description: 'window length (Fs = 2 kHz) — THE trade-off',
      options: [
        { value: 64, label: '64' },
        { value: 128, label: '128' },
        { value: 256, label: '256' },
        { value: 512, label: '512' },
        { value: 1024, label: '1024' },
      ],
      default: 256,
    }),
    win: select('window', {
      description: 'analysis window',
      options: [
        { value: 'hann', label: 'Hann' },
        { value: 'rect', label: 'rectangular' },
      ],
      default: 'hann',
    }),
    f1: float('f₁', {
      description: 'final frequency of the chirp (Nyquist = 1000 Hz)',
      min: 200,
      max: 3000,
      step: 10,
      default: 900,
      unit: 'Hz',
      precision: 0,
      visibleIf: { source: ['chirp', 'fm'] },
    }),
    df: float('Δf', {
      description: 'gap between the two tones (300 Hz and 300 + Δf)',
      min: 5,
      max: 100,
      step: 1,
      default: 15,
      unit: 'Hz',
      precision: 0,
      visibleIf: { source: 'tones' },
    }),
    fm: float('f_m', {
      description: 'AM modulation frequency (400 Hz carrier)',
      min: 2,
      max: 30,
      step: 0.5,
      default: 8,
      unit: 'Hz',
      precision: 1,
      visibleIf: { source: 'am' },
    }),
    fmod: float('f_mod', {
      description: 'frequency of the (slow) frequency modulation',
      min: 0.2,
      max: 5,
      step: 0.1,
      default: 1,
      unit: 'Hz',
      precision: 1,
      visibleIf: { source: 'fm' },
    }),
    fdev: float('Δ', {
      description: 'frequency deviation of the modulated sinusoid',
      min: 20,
      max: 400,
      step: 10,
      default: 150,
      unit: 'Hz',
      visibleIf: { source: 'fm' },
    }),
    tcut: float('t', {
      description: 'instant of the spectral slice and the time zoom',
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
    { title: 'Analysis', params: ['N', 'win', 'tcut'] },
  ],

  views: [
    // CUSTOM view: a time-frequency matrix fits no generic SVG type — see the
    // justification comment in views/Spectrogram.svelte (canvas-rasterized,
    // embedded as an SVG <image> so freeze/export keep working).
    custom('map', 'Spectrogram', () => import('./views/Spectrogram.svelte')),

    // The two readings the map exists to improve on, under the catalogue's
    // own names so they are recognised for what they are — the same
    // "Time signal" and the same "Spectrum" as everywhere else in
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
        label: '|X(f)| over the 2 s',
        overlays: [vline('nyquist', { color: '#EDB120', dashed: true, label: 'Fs/2' })],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|X(f)|', unit: 'dB', domain: [-80, 5] },
        },
      })
    ),

    view(
      'slice',
      'Slice at t',
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
      'Signal around t',
      line('zoom', {
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),
  ],
};
