import { float, log, select } from '../../../core/fields.js';
import { view, plane, line, scatter, vline, hline } from '../../../core/views.js';
import { gainView, phaseView, GUIDE, GUIDE_COLOR } from '../../../core/response-views.js';

/** The three verticals both Bode halves carry: the cursor, and the two
 *  pulsations the margins are read at. Declared once, so the two figures can
 *  never drift apart. */
const MARKS = [
  vline((p) => p.wc, { color: '#EDB120', width: 2, label: 'ω_c' }),
  vline('wco', { color: '#0072BD', dashed: true, width: 1.6, label: 'ω at 0 dB' }),
  vline('w180', { color: '#D95319', dashed: true, width: 1.6, label: 'ω at −180°' }),
];

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'frequency-plots',
  order: 4,
  title: 'Bode, Nyquist, Black',
  subtitle: 'Three diagrams, one H(jω) — and a cursor to tie them together',
  tags: [
    'Bode',
    'Nyquist',
    'Black',
    'Nichols',
    'resonance',
    'transfer locus',
    'gain margin',
    'phase margin',
    'stability',
  ],

  doc: `All four views plot THE SAME complex number H(jω); nothing changes between
them but the way of looking. A first order at its cutoff reads −3.01 dB and
−45°, and those two numbers are found four times: heights on the two Bode
plots, length and angle of the segment on Nyquist, abscissa and ordinate on
Black. The Nyquist locus of a first order is an exact half-circle — centred
at K/2, radius K/2, cutoff at the top — and the geometry answers before the
algebra why the phase never passes −90°.

The second order adds the resonance: at m = 0.3 a +4.85 dB bump at
ω₀√(1−2m²), a swelling on Nyquist, a nose on Black — the same bump lying
down — vanishing exactly at m = 1/√2.

The open loop is where the −1 point earns its keep. The phase margin is
read at the 0 dB crossing, the gain margin at the −180° crossing — two
lines, two gaps on the Bode plots; on Nyquist the same numbers are the
factor left before −1 and the angle left on the unit circle; on Black the
horizontal and vertical gaps to the critical point. Raising K scales the
locus about the origin while −1 stays put — the whole idea of the Nyquist
criterion — and at K = 6, exactly (τ₁+τ₂)/(τ₁τ₂), the locus passes through
−1 and both margins fall to zero together.`,


  params: {
    sys: select('system', {
      description: 'the transfer function plotted',
      // the expression IS the name of the system: "first order K/(1+jωτ)" said
      // the same thing twice, and the prose was the half that did not fit on a
      // pill
      options: [
        { value: 'first', label: 'K/(1+jωτ)' },
        { value: 'second', label: 'Kω₀²/(ω₀²−ω²+2jmω₀ω)' },
        { value: 'openloop', label: 'third order, astatic' },
      ],
      default: 'first',
    }),
    wc: log('ω_c', {
      description: 'THE cursor: the frequency read simultaneously on all four views',
      min: 0.01,
      max: 100,
      default: 1,
      unit: 'rad/s',
      precision: 2,
    }),
    // log, and up to 30: the open-loop scene has to CROSS K critique = 6/τ,
    // which a linear 0.2…3 slider could never reach
    K: log('K', {
      description: 'gain — static, or loop gain',
      min: 0.1,
      max: 30,
      default: 1,
      precision: 2,
    }),
    tau: log('τ', {
      description: 'time constant (τ₂ = τ/5 in open loop)',
      min: 0.05,
      max: 5,
      default: 1,
      unit: 's',
      precision: 2,
      visibleIf: { sys: ['first', 'openloop'] },
    }),
    w0: log('ω₀', {
      description: 'natural frequency',
      min: 0.2,
      max: 20,
      default: 1,
      unit: 'rad/s',
      precision: 2,
      visibleIf: { sys: 'second' },
    }),
    m: float('m', {
      description: 'damping — resonance appears below 1/√2 ≈ 0.707',
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
      label: 'resonance?',
      calc: (p) =>
        p.sys === 'first'
          ? 'no (first order)'
          : p.sys === 'openloop'
            ? 'not applicable (open loop)'
            : p.m < Math.SQRT1_2
              ? `yes: m = ${p.m} < 0.707`
              : `no: m = ${p.m} ≥ 0.707`,
    },
    // The number the open-loop scene is built around: (τ₁+τ₂)/(τ₁τ₂) = 6/τ.
    // Below it both margins are positive, above it the closed loop diverges.
    stability: {
      label: 'closed loop',
      calc: (p) => {
        if (p.sys !== 'openloop') return 'not applicable (no loop)';
        const kc = 6 / p.tau;
        return p.K < kc
          ? `stable: K = ${(+p.K).toFixed(2)} < K_crit = ${kc.toFixed(2)}`
          : `unstable: K = ${(+p.K).toFixed(2)} ≥ K_crit = ${kc.toFixed(2)}`;
      },
    },
  },

  groups: [
    { title: 'Reading', params: ['wc'] },
    { title: 'System', params: ['sys', 'K', 'tau', 'w0', 'm'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // Bode, split in two as the subject does — gainView/phaseView are the
    // catalogue's shared frequency figures, so this Bode plot IS the analog
    // filter's frequency response with another abscissa.
    // The three verticals are the SAME on both halves: the cursor, and the
    // two margin readings. A margin is a GAP on a plot, not a number in a
    // statline, so both ends of each gap have to be drawn. Every reference is
    // NaN when it means nothing for the current system, and a non-finite
    // vline/hline is simply not drawn.
    gainView('gain', {
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
      curves: [{ source: 'locus', color: '#0072BD', width: 2.4, label: 'locus H(jω)' }],
      clouds: [{ source: 'critical', color: GUIDE_COLOR, r: 4, opacity: 1, label: 'point −1' }],
      markers: { source: 'cursorPt', color: '#EDB120', label: 'H(jω_c)' },
      // the unit circle is the phase-margin construction: it only means
      // something for the open loop, so its radius is NaN elsewhere and the
      // circle (legend included) is simply not drawn
      circle: {
        radius: (p) => (p.sys === 'openloop' ? 1 : NaN),
        color: GUIDE_COLOR,
        label: 'unit circle',
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
    // The iso-gain abaque is NOT here: it answers a question about a CLOSED
    // loop, and this experiment draws systems that are not in one. It lives
    // in `closed-loop`, where the contour the locus touches has a meaning
    // and an exact value to be checked against.
    view(
      'black',
      'Black (Nichols)',
      line('black', {
        color: '#0072BD',
        width: 2.4,
        label: 'Black locus',
        overlays: [
          scatter('cursorBlack', { color: '#EDB120', size: 7, label: 'ω_c' }),
          scatter('criticalBlack', { color: GUIDE_COLOR, size: 6, label: 'critical point' }),
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
