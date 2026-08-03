import { float, log, select } from '../../../core/fields.js';
import { view, plane, line, scatter, vline, hline } from '../../../core/views.js';
import { gainView, phaseView, GUIDE_COLOR } from '../../../core/response-views.js';

/** The three verticals both Bode halves carry: the cursor, and the two
 *  pulsations the margins are read at. Declared once, so the two figures can
 *  never drift apart. */
const MARKS = [
  vline((p) => p.wc, { color: '#EDB120', width: 2, label: 'ω_c' }),
  vline('wco', { color: '#0072BD', dashed: true, width: 1.6, label: 'ω à 0 dB' }),
  vline('w180', { color: '#D95319', dashed: true, width: 1.6, label: 'ω à −180°' }),
];
const GUIDE = { color: GUIDE_COLOR, width: 1, dashed: true };

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'frequency-plots',
  order: 3,
  title: 'Bode, Nyquist, Black',
  subtitle: 'Trois diagrammes, un seul H(jω) — et un curseur pour les relier',
  tags: [
    'Bode',
    'Nyquist',
    'Black',
    'Nichols',
    'résonance',
    'lieu de transfert',
    'marge de gain',
    'marge de phase',
    'stabilité',
  ],

  params: {
    sys: select('système', {
      description: 'la fonction de transfert tracée',
      options: [
        { value: 'first', label: 'premier ordre K/(1+jωτ)' },
        { value: 'second', label: 'second ordre Kω₀²/(ω₀²−ω²+2jmω₀ω)' },
        { value: 'openloop', label: 'boucle ouverte K/(jω(1+jωτ)(1+jωτ/5))' },
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
    // log, and up to 30: the open-loop scene has to CROSS K critique = 6/τ,
    // which a linear 0.2…3 slider could never reach
    K: log('K', {
      description: 'gain — statique, ou gain de boucle',
      min: 0.1,
      max: 30,
      default: 1,
      precision: 2,
    }),
    tau: log('τ', {
      description: 'constante de temps (τ₂ = τ/5 en boucle ouverte)',
      min: 0.05,
      max: 5,
      default: 1,
      unit: 's',
      precision: 2,
      visibleIf: { sys: ['first', 'openloop'] },
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
        p.sys === 'first'
          ? 'non (premier ordre)'
          : p.sys === 'openloop'
            ? 'sans objet (boucle ouverte)'
            : p.m < Math.SQRT1_2
              ? `oui : m = ${p.m} < 0.707`
              : `non : m = ${p.m} ≥ 0.707`,
    },
    // The number the open-loop scene is built around: (τ₁+τ₂)/(τ₁τ₂) = 6/τ.
    // Below it both marges sont positives, au-dessus la boucle fermée diverge.
    stability: {
      label: 'boucle fermée',
      calc: (p) => {
        if (p.sys !== 'openloop') return 'sans objet (pas de boucle)';
        const kc = 6 / p.tau;
        return p.K < kc
          ? `stable : K = ${(+p.K).toFixed(2)} < K_crit = ${kc.toFixed(2)}`
          : `instable : K = ${(+p.K).toFixed(2)} ≥ K_crit = ${kc.toFixed(2)}`;
      },
    },
  },

  groups: [
    { title: 'Lecture', params: ['wc'] },
    { title: 'Système', params: ['sys', 'K', 'tau', 'w0', 'm'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // Bode, split in two as the subject does — gainView/phaseView are the
    // catalogue's shared frequency figures, so this Bode plot IS the analog
    // filter's réponse fréquentielle with another abscissa.
    // The three verticals are the SAME on both halves: the cursor, and the
    // two margin readings. A margin is a GAP on a plot, not a number in a
    // statline, so both ends of each gap have to be drawn. Every reference is
    // NaN when it means nothing for the current system, and a non-finite
    // vline/hline is simply not drawn.
    gainView('gain', {
      id: 'gain',
      title: 'Bode — gain',
      overlays: [
        ...MARKS,
        vline('wr', { color: '#D95319', dashed: true, width: 1.6, label: 'ω_r' }),
        hline((p) => (p.sys === 'openloop' ? NaN : -3), { ...GUIDE, label: '−3 dB' }),
        hline((p) => (p.sys === 'openloop' ? 0 : NaN), { ...GUIDE, label: '0 dB' }),
      ],
    }),

    phaseView('phase', {
      overlays: [
        ...MARKS,
        hline((p) => (p.sys === 'openloop' ? NaN : -90), { ...GUIDE, label: '−90°' }),
        hline((p) => (p.sys === 'openloop' ? -180 : NaN), { ...GUIDE, label: '−180°' }),
      ],
    }),

    // Nyquist needs equal aspect — a half-circle must LOOK like a half-circle,
    // which is exactly what the plane view exists for. Hand-written rather
    // than through polesView: a locus is not a pole map.
    plane('nyquist', 'Nyquist', {
      curves: [
        // the abaque, under the locus: the Hall circles are the closed-loop
        // iso-gain family |H/(1+H)| = M, and the highlighted one is the level
        // the locus is TANGENT to — the closed loop's resonance, read off the
        // open loop. Empty (hence invisible, legend included) for the fixed
        // orders, which have no loop to close.
        { source: 'hallGain', color: GUIDE_COLOR, width: 1, dashed: true, label: 'iso-gain BF' },
        { source: 'hallPeak', color: '#EDB120', width: 1.8, label: 'résonance BF' },
        { source: 'locus', color: '#0072BD', width: 2.4, label: 'lieu H(jω)' },
      ],
      clouds: [{ source: 'critical', color: GUIDE_COLOR, r: 4, opacity: 1, label: 'point −1' }],
      markers: { source: 'cursorPt', color: '#EDB120', label: 'H(jω_c)' },
      // the unit circle is the phase-margin construction: it only means
      // something for the open loop, so its radius is NaN elsewhere and the
      // circle (legend included) is simply not drawn
      circle: {
        radius: (p) => (p.sys === 'openloop' ? 1 : NaN),
        color: GUIDE_COLOR,
        label: 'cercle unité',
      },
      axes: { x: 'Re H(jω)', y: 'Im H(jω)' },
      // the locus sits under the real axis: framing it on the origin would
      // waste the whole upper half of the plot
      symmetric: false,
      minHalf: 0.6,
      maxHalf: 12,
    }),

    // Black (Nichols): the same locus with the axes exchanged — gain against
    // phase, ω sliding along the curve instead of labelling it.
    // The abaque de Nichols is the MAIN source and the locus an overlay, for
    // one reason: layers draw in declaration order, and a chart grid belongs
    // UNDER the curve it is read against. It is what turns Black from a
    // curiosity into the tool the subject uses — the closed loop is read off
    // the open-loop locus by seeing which contour the locus touches. Empty
    // (hence invisible, legend included) for the fixed orders, which have no
    // loop to close.
    view(
      'black',
      'Black (Nichols)',
      line('isoGain', {
        color: GUIDE_COLOR,
        width: 1,
        dashed: true,
        label: 'iso-gain BF',
        overlays: [
          line('isoPeak', { color: '#EDB120', width: 1.8, label: 'résonance BF' }),
          line('black', { color: '#0072BD', width: 2.4, label: 'lieu de Black' }),
          scatter('cursorBlack', { color: '#EDB120', size: 7, label: 'ω_c' }),
          scatter('criticalBlack', { color: GUIDE_COLOR, size: 6, label: 'point critique' }),
          hline(() => 0, { color: GUIDE_COLOR, width: 1 }),
          vline(() => -180, { ...GUIDE, label: '−180°' }),
        ],
        axes: {
          x: { label: 'arg H', unit: '°' },
          y: { label: '|H|', unit: 'dB' },
        },
      })
    ),
  ],
};
