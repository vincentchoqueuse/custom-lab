import { float, select } from '../../../core/fields.js';
import { view, line, band, vline } from '../../../core/views.js';
import { gainView, polesView, HERTZ } from '../../../core/response-views.js';
import { requiredOrder } from './compute.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'filter-design',
  order: 8,
  title: 'Analog filter design',
  subtitle: 'One specification, four families — the order is a result, not a choice',
  tags: ['analog', 'filter', 'Butterworth', 'Chebyshev', 'elliptic', 'specification'],

  doc: `One specification — a ripple budget below f_p, a rejection floor above f_a,
and a transition band where the only rule is not to rise above 0 dB — and
four families that meet it at different prices. At 1 dB of ripple, 40 dB of
attenuation and one octave of transition: Butterworth order 8, Chebyshev 5,
elliptic 4. Order is not an abstraction — it is op-amps, capacitors and
cost — and every tightening of the template is paid in order: the same
elliptic goes from 6 to 8 when the transition narrows from 1.4× to 1.2×.

The pole view shows where the orders come from. Butterworth puts its poles
on a circle; Chebyshev flattens it into an ellipse; Chebyshev 2 and the
elliptic add zeros on the jω axis, and those zeros dig the stop-band
notches. Fewer poles, better placed, plus zeros: the history of filter
design in one figure.

The group-delay view answers the question the first scene leaves open — if
the elliptic is half the order, why is Butterworth everywhere? The
Butterworth delay is nearly flat; the elliptic's soars near f_p, so
components close to the band edge arrive late. Selectivity is paid for in
phase, and phase distortion wrecks transients.`,


  params: {
    family: select('family', {
      description: 'approximation family',
      options: [
        { value: 'butter', label: 'Butterworth' },
        { value: 'cheby1', label: 'Chebyshev 1' },
        { value: 'cheby2', label: 'Chebyshev 2' },
        { value: 'ellip', label: 'elliptic (Cauer)' },
      ],
      default: 'butter',
    }),
    fp: float('f_p', {
      description: 'pass-band edge',
      min: 200,
      max: 2000,
      step: 10,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    fstop: float('f_a', {
      description: 'stop-band edge',
      min: 400,
      max: 8000,
      step: 10,
      default: 2000,
      unit: 'Hz',
      precision: 0,
    }),
    Amax: float('A_max', {
      description: 'maximum pass-band ripple',
      min: 0.1,
      max: 3,
      step: 0.1,
      default: 1,
      unit: 'dB',
      precision: 1,
    }),
    Amin: float('A_min', {
      description: 'minimum stop-band attenuation',
      min: 20,
      max: 80,
      step: 1,
      default: 40,
      unit: 'dB',
      precision: 0,
    }),
  },

  validate: [
    { when: (p) => p.fstop <= 1.15 * p.fp, message: 'f_a must exceed 1.15·f_p (transition band)' },
    {
      when: (p) => requiredOrder(p) > 16,
      message: 'specification too demanding for this family (n > 16) — relax it or change family',
    },
  ],

  derived: {
    selectivity: { label: 'selectivity f_a/f_p', calc: (p) => (p.fstop / p.fp).toFixed(2) },
  },

  views: [
    // |H| on a log hertz axis — the shared frequency figure, with this
    // experiment's own gabarit bands laid over it.
    gainView('response', {
      x: HERTZ,
      yLabel: '|H(jf)|',
      domain: [-90, 5],
      label: undefined,
      color: undefined,
      width: 2,
      overlays: [
        // the three forbidden zones of the template, in one legend entry: no
        // gain anywhere below f_a, at least Amin of rejection above it, at
        // most Amax of ripple below f_p. The response threads between them.
        band('zoneTop', { color: '#EDB120', opacity: 0.18, label: 'forbidden' }),
        band('zoneStop', { color: '#EDB120', opacity: 0.18 }),
        band('zonePass', { color: '#EDB120', opacity: 0.18 }),
        vline('fp', { color: '#EDB120', dashed: true, label: 'f_p' }),
        vline('fstop', { color: '#EDB120', dashed: true, label: 'f_a' }),
      ],
    }),
    polesView({
      zeroLabel: 'zeros (on jω)',
      circle: { radius: 1, label: 'circle |s| = ωp' },
      segments: [{ x1: 0, y1: -5, x2: 0, y2: 5 }],
      axes: { x: 'Re(s)/ωp', y: 'Im(s)/ωp' },
      minHalf: 1.4,
      maxHalf: 5,
    }),
    view(
      'delay',
      'Group delay',
      line('delay', {
        overlays: [vline('fp', { color: '#EDB120', dashed: true, label: 'f_p' })],
        axes: { x: { label: 'f', unit: 'Hz' }, y: { label: 'τg', unit: 'ms' } },
      })
    ),
  ],
};
