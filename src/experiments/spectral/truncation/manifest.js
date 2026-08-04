import { float, log, select } from '../../../core/fields.js';
import { view, line, vline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'truncation',
  order: 1,
  title: 'Time truncation',
  subtitle: 'Observing for T is multiplying by a window — and convolving the spectrum',
  tags: ['analog', 'digital', 'truncation', 'window', 'resolution', 'Gabor'],

  params: {
    sig: select('signal', {
      description: 'signal observed (defined independently of the duration)',
      options: [
        { value: 'sine', label: 'sinusoid' },
        { value: 'chirp', label: 'linear chirp' },
        { value: 'damped', label: 'damped sinusoid' },
        { value: 'burst', label: 'burst' },
      ],
      default: 'sine',
    }),
    T: float('T', {
      description: 'observation duration',
      min: 3,
      max: 250,
      step: 1,
      default: 40,
      unit: 'ms',
      precision: 0,
    }),
    win: select('fenêtre', {
      description: 'shape of the truncation',
      options: [
        { value: 'rect', label: 'rectangular (bare truncation)' },
        { value: 'hann', label: 'Hann' },
        { value: 'hamming', label: 'Hamming' },
        { value: 'blackman', label: 'Blackman' },
      ],
      default: 'rect',
    }),
    f0: float('f₀', {
      description: 'signal frequency',
      min: 100,
      max: 800,
      step: 5,
      default: 300,
      unit: 'Hz',
      precision: 0,
    }),
    k: log('k', {
      description: 'sweep rate of the chirp',
      min: 200,
      max: 4000,
      default: 2000,
      unit: 'Hz/s',
      precision: 0,
      visibleIf: { sig: 'chirp' },
    }),
    tau: log('τ', {
      description: 'damping constant',
      min: 1,
      max: 100,
      default: 15,
      unit: 'ms',
      precision: 1,
      visibleIf: { sig: 'damped' },
    }),
    tb: float('T_salve', {
      description: 'burst duration',
      min: 5,
      max: 200,
      step: 1,
      default: 30,
      unit: 'ms',
      visibleIf: { sig: 'burst' },
    }),
    // no seed here: injected by the core (unused: deterministic signals)
  },

  derived: {
    // which regime the chirp is in: k·T² ≪ 1 the truncation dominates,
    // k·T² ≫ 1 the sweep does, and the trough of the V sits in between
    regime: {
      label: 'k·T² product of the chirp',
      calc: (p) => (p.sig === 'chirp' ? (p.k * (p.T / 1000) ** 2).toFixed(2) : '—'),
    },
  },

  groups: [
    { title: 'Observation', params: ['T', 'win'] },
    { title: 'Signal', params: ['sig', 'f0', 'k', 'tau', 'tb'] },
  ],

  views: [
    // THE figure: what is kept, what is thrown away, and the gate between.
    figure(
      'time',
      line('xFull', {
        color: '#a1a1aa',
        width: 1,
        label: 'full signal',
        overlays: [
          line('gate', { color: '#D95319', width: 2, dashed: true, label: 'window w(t)' }),
          line('windowed', { color: '#0072BD', width: 2, label: 'what is transformed' }),
          vline('T', { color: '#EDB120', dashed: true, width: 2, label: 'T' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: 'x(t)' },
      })
    ),

    // The consequence: a line of zero width becomes a lobe of width ≈ 1/T.
    figure(
      'spectrum',
      line('spectrum', {
        width: 2,
        overlays: [vline('f0', { color: '#EDB120', dashed: true, label: 'f₀' })],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|X_T(f)|', unit: 'dB', domain: [-90, 3] },
        },
      })
    ),

    // The law, measured: 1/T for a tone, a U with a minimum for the chirp,
    // a plateau for the damped sine and the burst.
    view(
      'width',
      'Width vs duration',
      line('widthVsT', {
        color: '#7E2F8E',
        width: 2.2,
        label: 'measured −3 dB width',
        overlays: [vline('T', { color: '#EDB120', dashed: true, width: 2, label: 'T' })],
        axes: {
          x: { label: 'duration T', unit: 'ms', scale: 'log' },
          y: { label: '−3 dB width', unit: 'Hz', scale: 'log' },
        },
      })
    ),
  ],
};
