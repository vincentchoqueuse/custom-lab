import { float, log, select } from '../../../core/fields.js';
import { view, plane, line, scatter, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'frequency-plots',
  order: 3,
  title: 'Bode, Nyquist, Black',
  subtitle: 'Trois diagrammes, un seul H(jω) — et un curseur pour les relier',
  tags: ['Bode', 'Nyquist', 'Black', 'Nichols', 'résonance', 'lieu de transfert'],

  params: {
    sys: select('système', {
      description: 'la fonction de transfert tracée',
      options: [
        { value: 'first', label: 'premier ordre K/(1+jωτ)' },
        { value: 'second', label: 'second ordre Kω₀²/(ω₀²−ω²+2jmω₀ω)' },
      ],
      default: 'first',
    }),
    wc: log('ω_c', {
      description: 'LE curseur : la pulsation lue simultanément sur les quatre vues',
      min: 0.01,
      max: 100,
      default: 1,
      unit: 'rad/s',
      precision: 2,
    }),
    K: float('K', { description: 'gain statique', min: 0.2, max: 3, step: 0.05, default: 1 }),
    tau: log('τ', {
      description: 'constante de temps',
      min: 0.05,
      max: 5,
      default: 1,
      unit: 's',
      precision: 2,
      visibleIf: { sys: 'first' },
    }),
    w0: log('ω₀', {
      description: 'pulsation propre',
      min: 0.2,
      max: 20,
      default: 1,
      unit: 'rad/s',
      precision: 2,
      visibleIf: { sys: 'second' },
    }),
    m: float('m', {
      description: 'amortissement — la résonance apparaît sous 1/√2 ≈ 0.707',
      min: 0.05,
      max: 2,
      step: 0.05,
      default: 0.3,
      precision: 2,
      visibleIf: { sys: 'second' },
    }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    resonance: {
      label: 'résonance ?',
      calc: (p) =>
        p.sys !== 'second'
          ? 'non (premier ordre)'
          : p.m < Math.SQRT1_2
            ? `oui : m = ${p.m} < 0.707`
            : `non : m = ${p.m} ≥ 0.707`,
    },
  },

  groups: [
    { title: 'Lecture', params: ['wc'] },
    { title: 'Système', params: ['sys', 'K', 'tau', 'w0', 'm'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // Bode, split in two as the subject does — and the cursor's vline is the
    // same pulsation the other three views mark as a point.
    view(
      'gain',
      'Bode — gain',
      line('gain', {
        width: 2.4,
        label: '|H(jω)|',
        overlays: [
          vline((p) => p.wc, { color: '#EDB120', width: 2, label: 'ω_c' }),
          vline('wr', { color: '#D95319', dashed: true, width: 1.6, label: 'ω_r' }),
          hline(() => -3, { color: '#a1a1aa', width: 1, dashed: true, label: '−3 dB' }),
        ],
        axes: {
          x: { label: 'ω', unit: 'rad/s', scale: 'log' },
          y: { label: '|H|', unit: 'dB' },
        },
      })
    ),

    view(
      'phase',
      'Bode — phase',
      line('phase', {
        color: '#77AC30',
        width: 2.4,
        label: 'arg H(jω)',
        overlays: [
          vline((p) => p.wc, { color: '#EDB120', width: 2, label: 'ω_c' }),
          hline(() => -90, { color: '#a1a1aa', width: 1, dashed: true, label: '−90°' }),
        ],
        axes: {
          x: { label: 'ω', unit: 'rad/s', scale: 'log' },
          y: { label: 'phase', unit: '°' },
        },
      })
    ),

    // Nyquist needs equal aspect — a half-circle must LOOK like a half-circle,
    // which is exactly what the plane view exists for.
    plane('nyquist', 'Nyquist', {
      curves: [{ source: 'locus', color: '#0072BD', width: 2.4, label: 'lieu H(jω)' }],
      clouds: [{ source: 'critical', color: '#a1a1aa', r: 4, opacity: 1, label: 'point −1' }],
      markers: { source: 'cursorPt', color: '#EDB120', label: 'H(jω_c)' },
      axes: { x: 'Re H(jω)', y: 'Im H(jω)' },
      // the locus sits under the real axis: framing it on the origin would
      // waste the whole upper half of the plot
      symmetric: false,
      minHalf: 0.6,
      maxHalf: 12,
    }),

    // Black (Nichols): the same locus with the axes exchanged — gain against
    // phase, ω sliding along the curve instead of labelling it.
    view(
      'black',
      'Black (Nichols)',
      line('black', {
        width: 2.4,
        label: 'lieu de Black',
        overlays: [
          scatter('cursorBlack', { color: '#EDB120', size: 7, label: 'ω_c' }),
          scatter('criticalBlack', { color: '#a1a1aa', size: 6, label: 'point critique' }),
          hline(() => 0, { color: '#a1a1aa', width: 1 }),
          vline(() => -180, { color: '#a1a1aa', width: 1, dashed: true, label: '−180°' }),
        ],
        axes: {
          x: { label: 'arg H', unit: '°' },
          y: { label: '|H|', unit: 'dB' },
        },
      })
    ),
  ],
};
