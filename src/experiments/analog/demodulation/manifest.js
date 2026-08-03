import { float } from '../../../core/fields.js';
import { view, figure, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'demodulation',
  order: 5,
  random: true, // bruit gaussien additif
  title: 'Démodulation AM et FM',
  subtitle: 'Retrouver A(t) et f(t) — une méthode globale, une méthode locale',
  tags: ['démodulation', 'Hilbert', 'Teager-Kaiser', 'DESA', 'enveloppe', 'fréquence instantanée'],

  params: {
    fc: float('f_c', {
      description: 'porteuse — c’est elle qu’il faut monter pour atteindre Fs/4',
      min: 400,
      max: 2400,
      step: 50,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    ka: float('k_a', {
      description: "profondeur de modulation d'amplitude",
      min: 0,
      max: 0.9,
      step: 0.05,
      default: 0.5,
      precision: 2,
    }),
    fam: float('f_AM', {
      description: "fréquence de la modulation d'amplitude",
      min: 10,
      max: 120,
      step: 5,
      default: 40,
      unit: 'Hz',
      precision: 0,
    }),
    fdev: float('Δf', {
      description: 'excursion en fréquence (Fs = 8 kHz)',
      min: 0,
      max: 800,
      step: 25,
      default: 200,
      unit: 'Hz',
      precision: 0,
    }),
    ffm: float('f_FM', {
      description: 'fréquence de la modulation de fréquence',
      min: 5,
      max: 100,
      step: 5,
      default: 25,
      unit: 'Hz',
      precision: 0,
    }),
    snr: float('SNR', {
      description: 'rapport signal à bruit',
      min: 0,
      max: 60,
      step: 1,
      default: 40,
      unit: 'dB',
      precision: 0,
    }),
    // seed injecté par le cœur, parce que random: true
  },

  validate: [
    {
      // f_i < 0 n'est pas un cas d'école mais une bouillie : le signal
      // analytique n'y a plus de sens et les DEUX méthodes déraillent, pour
      // une raison sans rapport avec ce que l'expérience enseigne.
      when: (p) => p.fc - p.fdev < 50,
      message: 'La fréquence instantanée passerait sous 50 Hz : baisser Δf ou monter f_c',
    },
  ],

  derived: {
    bande: {
      label: 'fréquence instantanée',
      calc: (p) => `${p.fc - p.fdev} … ${p.fc + p.fdev} Hz`,
    },
    desa: {
      label: 'domaine de DESA (Fs/4)',
      calc: (p) => (p.fc + p.fdev > 2000 ? 'DÉPASSÉ — Teager va se replier' : 'respecté'),
    },
  },

  groups: [
    { title: 'Modulation', params: ['fc', 'ka', 'fam', 'fdev', 'ffm'] },
    { title: 'Bruit', params: ['snr'] },
  ],

  views: [
    // Le signal, et les deux enveloppes posées sur la vraie. Le signal lui-
    // même est estompé : c'est le support, pas le sujet.
    figure(
      'time',
      line('envTrue', {
        color: '#EDB120',
        width: 2.6,
        label: 'A(t) vraie',
        overlays: [
          line('signal', { color: '#a1a1aa', width: 0.7, opacity: 0.45, label: 'x(t)' }),
          line('envHilbert', { color: '#0072BD', width: 1.8, label: 'Hilbert' }),
          line('envTeager', { color: '#D95319', width: 1.8, label: 'Teager (DESA-2)' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: 'amplitude' },
      })
    ),

    // La seconde information cachée dans la même courbe. La ligne Fs/4 n'est
    // pas décorative : DESA-2 obtient Ω par un demi-arccos, donc son image
    // est [0, π/2] et il se REPLIE au-delà. Quand la fréquence instantanée
    // traverse cette ligne, la courbe orange s'en va et la bleue reste.
    view(
      'freq',
      'Fréquence instantanée',
      line('freqTrue', {
        color: '#EDB120',
        width: 2.6,
        label: 'f(t) vraie',
        overlays: [
          line('freqHilbert', { color: '#0072BD', width: 1.8, label: 'Hilbert' }),
          line('freqTeager', { color: '#D95319', width: 1.8, label: 'Teager (DESA-2)' }),
          hline(() => 2000, { color: '#77AC30', dashed: true, width: 1.6, label: 'Fs/4' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: { label: 'f', unit: 'Hz' } },
      })
    ),

    // Pour situer : la porteuse, ses bandes latérales, et le plancher de
    // bruit que les deux méthodes doivent traverser.
    figure(
      'spectrum',
      line('spectrum', {
        width: 1.6,
        label: '|X(f)|',
        overlays: [
          vline('fCarrier', { color: '#EDB120', dashed: true, width: 1.6, label: 'porteuse' }),
        ],
        axes: { x: { label: 'f', unit: 'Hz' }, y: { label: '|X(f)|', unit: 'dB' } },
      })
    ),
  ],
};
