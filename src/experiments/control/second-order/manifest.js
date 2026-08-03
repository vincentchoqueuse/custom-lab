import { float, log } from '../../../core/fields.js';
import { view, line, vline, hline } from '../../../core/views.js';
import { gainView, polesView, GUIDE_COLOR } from '../../../core/response-views.js';

const GUIDE = { color: GUIDE_COLOR, width: 1, dashed: true };

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'second-order',
  order: 2,
  title: 'Réponse d\'un second ordre',
  subtitle: 'm et ω₀ racontent tout : temporel, pôles et fréquentiel du même système',
  tags: ['second ordre', 'amortissement', 'pôles', 'résonance', 'réponse indicielle'],

  params: {
    K: float('K', { description: 'gain statique', min: 0.2, max: 2, step: 0.05, default: 1 }),
    m: float('m', {
      description: 'coefficient d\'amortissement',
      min: 0.05,
      max: 2,
      step: 0.05,
      default: 0.3,
      precision: 2,
    }),
    w0: log('ω₀', {
      description: 'pulsation propre',
      min: 0.5,
      max: 20,
      default: 2,
      unit: 'rad/s',
    }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    regime: {
      label: 'régime',
      calc: (p) =>
        p.m < 1 ? 'pseudo-périodique (m < 1)' : p.m === 1 ? 'critique (m = 1)' : 'apériodique (m > 1)',
    },
    q: { label: 'facteur de qualité Q = 1/2m', calc: (p) => (1 / (2 * p.m)).toFixed(2) },
  },

  groups: [
    { title: 'Système', params: ['K', 'm', 'w0'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // step response with the exponential envelope and the ±5% band
    view(
      'step',
      'Réponse indicielle',
      line('stepResponse', {
        width: 2.5,
        label: 'y(t)',
        overlays: [
          line('envHi', { color: '#D95319', width: 1.3, dashed: true, label: 'enveloppe' }),
          line('envLo', { color: '#D95319', width: 1.3, dashed: true }),
          hline((p) => p.K, { color: '#EDB120', dashed: true, width: 1.6, label: 'K' }),
          hline((p) => 1.05 * p.K, { color: GUIDE_COLOR, width: 1 }),
          hline((p) => 0.95 * p.K, { color: GUIDE_COLOR, width: 1, label: '±5%' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'y(t)' },
      })
    ),

    // impulse response: the same two parameters, seen as a free oscillation
    view(
      'impulse',
      'Réponse impulsionnelle',
      line('impulseResponse', {
        color: '#0072BD',
        width: 2.5,
        label: 'h(t)',
        overlays: [
          hline(() => 0, { color: GUIDE_COLOR, width: 1 }),
          vline((p) => Math.PI / (p.w0 * Math.sqrt(Math.max(1 - p.m * p.m, 0))), {
            color: '#EDB120',
            dashed: true,
            width: 1.4,
            label: 'T_d/2',
          }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'h(t)' },
      })
    ),

    // equal-aspect plane: the poles travel on the ω₀ circle as m varies,
    // then split on the real axis
    // a pure second order has no zero: polesView omits the cloud rather than
    // leaving an empty legend entry
    polesView({
      title: 'Plan des pôles',
      zeros: null,
      circle: { radius: (p) => p.w0, label: 'cercle |s| = ω₀' },
      minHalf: (p) => Math.max(1.3 * p.w0, 1),
      maxHalf: 60,
    }),

    // |H(jω)| in log-log with the resonance when m < 1/√2 — the catalogue's
    // shared frequency figure, same as the first order and the Bode plots
    gainView('freqResponse', {
      y: 'log',
      overlays: [
        vline((p) => p.w0, { color: '#EDB120', dashed: true, width: 1.8, label: 'ω₀' }),
        vline('wr', { color: '#D95319', dashed: true, width: 1.6, label: 'ωr' }),
        hline((p) => p.K, { ...GUIDE, label: 'K' }),
      ],
    }),
  ],
};
