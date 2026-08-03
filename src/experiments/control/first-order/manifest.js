import { float, log } from '../../../core/fields.js';
import { view, plane, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'first-order',
  order: 1,
  title: 'Réponse d\'un premier ordre',
  subtitle: 'τ gouverne tout — et un zéro suffit à faire partir la sortie à l\'envers',
  tags: ['premier ordre', 'constante de temps', 'pôle', 'zéro', 'phase non minimale'],

  params: {
    K: float('K', { description: 'gain statique', min: 0.2, max: 3, step: 0.05, default: 1 }),
    tau: log('τ', {
      description: 'constante de temps',
      min: 0.05,
      max: 5,
      default: 1,
      unit: 's',
      precision: 2,
    }),
    tz: float('τ_z', {
      description: 'constante de temps du zéro (0 : aucun zéro ; négative : phase non minimale)',
      min: -2,
      max: 2,
      step: 0.05,
      default: 0,
      unit: 's',
      precision: 2,
    }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    nature: {
      label: 'nature du système',
      calc: (p) =>
        p.tz === 0
          ? 'premier ordre pur'
          : p.tz < 0
            ? 'phase NON minimale (zéro à droite)'
            : p.tz > p.tau
              ? 'avance de phase (τ_z > τ)'
              : 'retard de phase (τ_z < τ)',
    },
    t95: { label: 'temps de montée à 95 % ≈ 3τ', calc: (p) => `${(3 * p.tau).toFixed(2)} s` },
  },

  groups: [{ title: 'Système', params: ['K', 'tau', 'tz'] }],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // Step response with the graphical constructions of the course: 63 % at
    // t = τ, 95 % at 3τ, and the initial tangent — which crosses the final
    // value at t = τ EXACTLY, zero or no zero (checked).
    // The two percentage readings hold for the PURE first order only: with a
    // zero the curve no longer starts at 0, so they are hidden rather than
    // left on screen pointing at the wrong instants. The tangent stays, since
    // its identity survives τ_z.
    view(
      'step',
      'Réponse indicielle',
      line('stepResponse', {
        width: 2.5,
        label: 'y(t)',
        overlays: [
          line('tangent', { color: '#D95319', width: 1.4, dashed: true, label: 'tangente en 0' }),
          hline((p) => p.K, { color: '#EDB120', dashed: true, width: 1.6, label: 'K' }),
          hline((p) => (p.tz === 0 ? 0.632 * p.K : NaN), {
            color: '#a1a1aa',
            width: 1,
            label: '63 % de K',
          }),
          vline((p) => (p.tz === 0 ? p.tau : NaN), {
            color: '#a1a1aa',
            width: 1,
            dashed: true,
            label: 'τ',
          }),
          hline((p) => (p.tz === 0 ? 0.95 * p.K : NaN), {
            color: '#a1a1aa',
            width: 1,
            label: '95 % de K',
          }),
          vline((p) => (p.tz === 0 ? 3 * p.tau : NaN), {
            color: '#a1a1aa',
            width: 1,
            dashed: true,
            label: '3τ',
          }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'y(t)' },
      })
    ),

    // Impulse response: the exponential, plus the Dirac the zero creates —
    // its weight is in the statline, since an arrow of infinite height is not
    // something a plot can honestly draw.
    view(
      'impulse',
      'Réponse impulsionnelle',
      line('impulseResponse', {
        color: '#0072BD',
        width: 2.5,
        label: 'h(t) — partie continue',
        overlays: [
          vline((p) => (p.tz === 0 ? NaN : 0), {
            color: '#D95319',
            width: 2,
            label: 'Dirac K·τ_z/τ',
          }),
          vline((p) => p.tau, { color: '#a1a1aa', width: 1, dashed: true, label: 'τ' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'h(t)' },
      })
    ),

    // One pole, at most one zero, on the equal-aspect s-plane: the zero
    // crosses to the right half-plane exactly when τ_z becomes negative.
    plane('poles', 'Pôles et zéros', {
      markers: { source: 'poles', color: '#D95319', label: 'pôle −1/τ' },
      clouds: [{ source: 'zeros', color: '#0072BD', r: 5, opacity: 1, label: 'zéro −1/τ_z' }],
      axes: { x: 'Re(s)', y: 'Im(s)' },
      minHalf: (p) => Math.max(1.5 / p.tau, 1),
      maxHalf: 60,
    }),

    // |H(jω)|: the −20 dB/decade slope, the cut-off at 1/τ, and the shelf a
    // zero produces instead of a roll-off.
    view(
      'freq',
      'Réponse fréquentielle',
      line('gain', {
        color: '#7E2F8E',
        width: 2.4,
        label: '|H(jω)|',
        overlays: [
          vline('wc', { color: '#EDB120', dashed: true, width: 1.8, label: 'ω_c = 1/τ' }),
          hline('gain3dB', { color: '#a1a1aa', width: 1, dashed: true, label: '−3 dB' }),
        ],
        axes: {
          x: { label: 'ω', unit: 'rad/s', scale: 'log' },
          y: { label: '|H|', scale: 'log' },
        },
      })
    ),

    // The phase, where the non-minimum-phase zero shows its true cost.
    view(
      'phase',
      'Phase',
      line('phase', {
        color: '#77AC30',
        width: 2.4,
        label: 'arg H(jω)',
        overlays: [
          vline('wc', { color: '#EDB120', dashed: true, width: 1.8, label: 'ω_c' }),
          hline(() => -45, { color: '#a1a1aa', width: 1, dashed: true, label: '−45°' }),
        ],
        axes: {
          x: { label: 'ω', unit: 'rad/s', scale: 'log' },
          y: { label: 'phase', unit: '°' },
        },
      })
    ),
  ],
};
