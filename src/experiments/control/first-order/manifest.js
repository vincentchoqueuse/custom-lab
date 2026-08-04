import { float, log } from '../../../core/fields.js';
import { view, line, vline, hline, figure } from '../../../core/views.js';
import { at, gainView, phaseView, polesView, GUIDE, GUIDE_COLOR } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'first-order',
  order: 1,
  title: 'First-order response',
  subtitle: 'τ governs everything — and one zero is enough to send the output backwards',
  tags: ['first order', 'time constant', 'pole', 'zero', 'non-minimum phase'],

  params: {
    K: float('K', { description: 'static gain', min: 0.2, max: 3, step: 0.05, default: 1 }),
    tau: log('τ', {
      description: 'time constant',
      min: 0.05,
      max: 5,
      default: 1,
      unit: 's',
      precision: 2,
    }),
    tz: float('τ_z', {
      description: 'time constant of the zero (0: no zero; negative: non-minimum phase)',
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
      label: 'nature of the system',
      calc: (p) =>
        p.tz === 0
          ? 'premier ordre pur'
          : p.tz < 0
            ? 'phase NON minimale (zéro à droite)'
            : p.tz > p.tau
              ? 'avance de phase (τ_z > τ)'
              : 'retard de phase (τ_z < τ)',
    },
    t95: { label: 'rise time to 95 % ≈ 3τ', calc: (p) => `${(3 * p.tau).toFixed(2)} s` },
  },

  groups: [{ title: 'System', params: ['K', 'tau', 'tz'] }],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // Step response with the graphical constructions of the course: 63 % at
    // t = τ, 95 % at 3τ, and the initial tangent — which crosses the final
    // value at t = τ EXACTLY, zero or no zero (checked).
    // The two percentage readings hold for the PURE first order only: with a
    // zero the curve no longer starts at 0, so they are hidden rather than
    // left on screen pointing at the wrong instants. The tangent stays, since
    // its identity survives τ_z.
    figure(
      'step',
      line('stepResponse', {
        width: 2.5,
        label: 'y(t)',
        overlays: [
          line('tangent', { color: '#D95319', width: 1.4, dashed: true, label: 'tangent at 0' }),
          hline((p) => p.K, { color: '#EDB120', dashed: true, width: 1.6, label: 'K' }),
          hline((p) => (p.tz === 0 ? 0.632 * p.K : NaN), {
            color: GUIDE_COLOR,
            width: 1,
            label: '63 % of K',
          }),
          vline((p) => (p.tz === 0 ? p.tau : NaN), { ...GUIDE, label: 'τ' }),
          hline((p) => (p.tz === 0 ? 0.95 * p.K : NaN), {
            color: GUIDE_COLOR,
            width: 1,
            label: '95 % of K',
          }),
          vline((p) => (p.tz === 0 ? 3 * p.tau : NaN), { ...GUIDE, label: '3τ' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'y(t)' },
      })
    ),

    // Impulse response: the exponential, plus the Dirac the zero creates —
    // its weight is in the statline, since an arrow of infinite height is not
    // something a plot can honestly draw.
    figure(
      'impulse',
      line('impulseResponse', {
        color: '#0072BD',
        width: 2.5,
        label: 'h(t) — continuous part',
        overlays: [
          vline((p) => (p.tz === 0 ? NaN : 0), {
            color: '#D95319',
            width: 2,
            label: 'Dirac K·τ_z/τ',
          }),
          vline((p) => p.tau, { ...GUIDE, label: 'τ' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'h(t)' },
      })
    ),

    // One pole, at most one zero, on the equal-aspect s-plane: the zero
    // crosses to the right half-plane exactly when τ_z becomes negative.
    polesView({
      poleLabel: 'pôle −1/τ',
      zeroLabel: 'zéro −1/τ_z',
      minHalf: (p) => Math.max(1.5 / p.tau, 1),
      maxHalf: 60,
    }),

    // |H(jω)|: the −20 dB/decade slope, the cut-off at 1/τ, and the shelf a
    // zero produces instead of a roll-off. Same builder as the Bode plot of
    // Bode, Nyquist, Black and as the analog filter's response: one figure.
    gainView('gain', {
      overlays: [
        vline('wc', { color: '#EDB120', dashed: true, width: 1.8, label: 'ω_c = 1/τ' }),
        hline('gain3dB', { ...GUIDE, label: '−3 dB' }),
      ],
    }),

    // The phase, where the non-minimum-phase zero shows its true cost.
    phaseView('phase', {
      overlays: [
        vline('wc', { color: '#EDB120', dashed: true, width: 1.8, label: 'ω_c' }),
        at(-45, '−45°'),
      ],
    }),
  ],
};
