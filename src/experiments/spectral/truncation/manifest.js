import { float, log, select } from '../../../core/fields.js';
import { view, line, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'truncation',
  order: 1,
  title: 'Troncature temporelle',
  subtitle: 'Observer pendant T, c\'est multiplier par une fenêtre — et convoluer le spectre',
  tags: ['analogique', 'numérique', 'troncature', 'fenêtre', 'résolution', 'Gabor'],

  params: {
    sig: select('signal', {
      description: 'signal observé (défini indépendamment de la durée)',
      options: [
        { value: 'sine', label: 'sinusoïde' },
        { value: 'chirp', label: 'chirp linéaire' },
        { value: 'damped', label: 'sinusoïde amortie' },
        { value: 'burst', label: 'salve' },
      ],
      default: 'sine',
    }),
    T: float('T', {
      description: 'durée d\'observation',
      min: 3,
      max: 250,
      step: 1,
      default: 40,
      unit: 'ms',
      precision: 0,
    }),
    win: select('fenêtre', {
      description: 'forme de la troncature',
      options: [
        { value: 'rect', label: 'rectangulaire (troncature nue)' },
        { value: 'hann', label: 'Hann' },
        { value: 'hamming', label: 'Hamming' },
        { value: 'blackman', label: 'Blackman' },
      ],
      default: 'rect',
    }),
    f0: float('f₀', {
      description: 'fréquence du signal',
      min: 100,
      max: 800,
      step: 5,
      default: 300,
      unit: 'Hz',
      precision: 0,
    }),
    k: log('k', {
      description: 'vitesse de balayage du chirp',
      min: 200,
      max: 4000,
      default: 2000,
      unit: 'Hz/s',
      precision: 0,
      visibleIf: { sig: 'chirp' },
    }),
    tau: log('τ', {
      description: 'constante d\'amortissement',
      min: 1,
      max: 100,
      default: 15,
      unit: 'ms',
      precision: 1,
      visibleIf: { sig: 'damped' },
    }),
    tb: float('T_salve', {
      description: 'durée de la salve',
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
      label: 'produit k·T² du chirp',
      calc: (p) => (p.sig === 'chirp' ? (p.k * (p.T / 1000) ** 2).toFixed(2) : '—'),
    },
  },

  groups: [
    { title: 'Observation', params: ['T', 'win'] },
    { title: 'Signal', params: ['sig', 'f0', 'k', 'tau', 'tb'] },
  ],

  views: [
    // THE figure: what is kept, what is thrown away, and the gate between.
    view(
      'time',
      'La troncature',
      line('xFull', {
        color: '#a1a1aa',
        width: 1,
        label: 'signal complet',
        overlays: [
          line('gate', { color: '#D95319', width: 2, dashed: true, label: 'fenêtre w(t)' }),
          line('windowed', { color: '#0072BD', width: 2, label: 'ce qui est transformé' }),
          vline('T', { color: '#EDB120', dashed: true, width: 2, label: 'T' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: 'x(t)' },
      })
    ),

    // The consequence: a line of zero width becomes a lobe of width ≈ 1/T.
    view(
      'spectrum',
      'Spectre du signal tronqué',
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
      'Largeur vs durée',
      line('widthVsT', {
        color: '#7E2F8E',
        width: 2.2,
        label: 'largeur à −3 dB mesurée',
        overlays: [vline('T', { color: '#EDB120', dashed: true, width: 2, label: 'T' })],
        axes: {
          x: { label: 'durée T', unit: 'ms', scale: 'log' },
          y: { label: 'largeur à −3 dB', unit: 'Hz', scale: 'log' },
        },
      })
    ),
  ],
};
