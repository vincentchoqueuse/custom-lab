import { float } from '../../../core/fields.js';
import { view, figure, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'demodulation',
  order: 5,
  random: true, // bruit gaussien additif
  // plural, like the mirror experiment "AM and FM modulation": both really carry
  // two, and the catalogue is read in pairs
  title: 'AM and FM demodulation',
  subtitle: 'Recovering A(t) and f(t) — one global method, one local method',
  tags: ['demodulation', 'Hilbert', 'Teager–Kaiser', 'DESA', 'envelope', 'instantaneous frequency'],

  params: {
    fc: float('f_c', {
      description: 'carrier — this is what to raise to reach Fs/4',
      min: 400,
      max: 2400,
      step: 50,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    ka: float('k_a', {
      description: 'amplitude modulation depth',
      min: 0,
      max: 0.9,
      step: 0.05,
      default: 0.5,
      precision: 2,
    }),
    fam: float('f_AM', {
      description: 'frequency of the amplitude modulation',
      min: 10,
      max: 120,
      step: 5,
      default: 40,
      unit: 'Hz',
      precision: 0,
    }),
    fdev: float('Δf', {
      description: 'frequency deviation (Fs = 8 kHz)',
      min: 0,
      max: 800,
      step: 25,
      default: 200,
      unit: 'Hz',
      precision: 0,
    }),
    ffm: float('f_FM', {
      description: 'frequency of the frequency modulation',
      min: 5,
      max: 100,
      step: 5,
      default: 25,
      unit: 'Hz',
      precision: 0,
    }),
    snr: float('SNR', {
      description: 'signal-to-noise ratio',
      min: 0,
      max: 60,
      step: 1,
      default: 40,
      unit: 'dB',
      precision: 0,
    }),
    // seed injected by the core, because random: true
  },

  validate: [
    {
      // f_i < 0 is not a textbook case but a mess: the analytic signal no longer
      // means anything there and BOTH methods go off the rails, for a reason
      // unrelated to what the experiment teaches.
      when: (p) => p.fc - p.fdev < 50,
      message: 'The instantaneous frequency would fall below 50 Hz: lower Δf or raise f_c',
    },
  ],

  derived: {
    bande: {
      label: 'instantaneous frequency',
      calc: (p) => `${p.fc - p.fdev} … ${p.fc + p.fdev} Hz`,
    },
    desa: {
      label: 'DESA validity range (Fs/4)',
      calc: (p) => (p.fc + p.fdev > 2000 ? 'DÉPASSÉ — Teager va se replier' : 'respecté'),
    },
  },

  groups: [
    { title: 'Modulation', params: ['fc', 'ka', 'fam', 'fdev', 'ffm'] },
    { title: 'Noise', params: ['snr'] },
  ],

  views: [
    // The signal, and the two envelopes laid over the true one. The signal
    // itself is faded: it is the carrier of the story, not the subject.
    figure(
      'time',
      line('envTrue', {
        color: '#EDB120',
        width: 2.6,
        label: 'true A(t)',
        overlays: [
          line('signal', { color: '#a1a1aa', width: 0.7, opacity: 0.45, label: 'x(t)' }),
          line('envHilbert', { color: '#0072BD', width: 1.8, label: 'Hilbert' }),
          line('envTeager', { color: '#D95319', width: 1.8, label: 'Teager (DESA-2)' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: 'amplitude' },
      })
    ),

    // The second piece of information hidden in the same curve. The Fs/4 line is
    // not decorative: DESA-2 obtains Ω through a half-arccos, so its range is
    // [0, π/2] and it FOLDS beyond that. When the instantaneous frequency crosses
    // that line, the orange curve leaves and the blue one stays.
    view(
      'freq',
      'Instantaneous frequency',
      line('freqTrue', {
        color: '#EDB120',
        width: 2.6,
        label: 'true f(t)',
        overlays: [
          line('freqHilbert', { color: '#0072BD', width: 1.8, label: 'Hilbert' }),
          line('freqTeager', { color: '#D95319', width: 1.8, label: 'Teager (DESA-2)' }),
          hline(() => 2000, { color: '#77AC30', dashed: true, width: 1.6, label: 'Fs/4' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: { label: 'f', unit: 'Hz' } },
      })
    ),

    // For context: the carrier, its sidebands, and the noise floor both methods
    // have to work through.
    figure(
      'spectrum',
      line('spectrum', {
        width: 1.6,
        label: '|X(f)|',
        overlays: [
          vline('fCarrier', { color: '#EDB120', dashed: true, width: 1.6, label: 'carrier' }),
        ],
        axes: { x: { label: 'f', unit: 'Hz' }, y: { label: '|X(f)|', unit: 'dB' } },
      })
    ),
  ],
};
