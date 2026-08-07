import { float, select, log } from '../../../core/fields.js';
import { figure, plane, line, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'root-locus',
  order: 6,
  title: 'The root locus',
  subtitle: 'Where the closed-loop poles go as the gain runs from 0 to ∞',
  tags: ['root locus', 'gain', 'poles', 'stability', 'asymptotes'],

  doc: `Closing a loop around K·G(s) moves the poles, and the root locus is the
map of that motion: the paths the closed-loop poles trace as K runs from 0 to
∞, starting on the open-loop poles and ending on the zeros or along the
asymptotes. It is the fourth classic figure of the chapter, and the one the
Bode, Nyquist and Black views cannot draw: they show one K at a time, this
shows every K at once.

Two real poles make the gentlest case: the branches walk toward each other,
meet at −1 exactly at K = 1, and turn vertical. Past the meeting the gain
buys speed of oscillation and nothing else — the real part is pinned, so the
settling time stops moving, which is the closed-loop experiment's lesson read
as geometry.

A third pole changes the destination. Three branches share ±60° and 180°
asymptotes, two of them bend RIGHT, and at K = 6 exactly they cross the axis
at ±j√2: the loop that tracked better and better diverges. More gain is not
more performance; on a third-order plant it is a countdown, and the statline
prints how far the dial is from the edge.

The rescue is a zero — a PD controller, seen geometrically. Branches end on
zeros, so a zero placed in the left half-plane BENDS the locus toward it, and
Routh gives the exact bill: with the zero at z < 3 the loop is stable at
every K; past z = 3 the asymptotes tip into the right half-plane and
K_crit = 6/(z−3). Where the zero goes matters as much as that it exists —
which is the whole craft of compensation, in one slider.`,

  params: {
    sys: select('G', {
      description: 'open-loop plant (unity feedback around K·G)',
      options: [
        { value: 'double', label: 'two real poles' },
        { value: 'triple', label: 'three real poles' },
        { value: 'zero', label: 'three poles and a zero' },
      ],
      default: 'double',
    }),
    K: log('K', {
      description: 'loop gain',
      min: 0.01,
      max: 100,
      default: 1,
      precision: 2,
    }),
    z: float('z', {
      description: 'position of the zero (at −z)',
      min: 0.5,
      max: 5,
      step: 0.1,
      default: 2,
      visibleIf: { sys: 'zero' },
    }),
  },

  derived: {
    charpoly: {
      label: 'characteristic polynomial',
      calc: (p) =>
        p.sys === 'double'
          ? 's² + 2s + K'
          : p.sys === 'triple'
            ? 's³ + 3s² + 2s + K'
            : 's³ + 3s² + (2+K)s + Kz',
    },
  },

  // deterministic: no seed, no dice — the locus is a computed object
  views: [
    // The locus leads, ahead of the subject's usual temporal-first grammar:
    // this experiment's subject IS the pole geometry, and the step response is
    // its consequence. Its own id and title — the figure belongs to this
    // experiment, not to the catalogue's standard set ('poles' is the static
    // pole map; this is the path).
    plane('locus', 'The root locus', {
      curves: [{ source: 'branches', color: '#0072BD', width: 2 }],
      clouds: [
        { source: 'openPoles', color: '#7E2F8E', r: 5, opacity: 1, label: 'poles (K = 0)' },
        { source: 'openZeros', color: '#77AC30', r: 4.5, opacity: 1, label: 'zero (K → ∞)' },
      ],
      markers: { source: 'nowPoles', color: '#D95319', label: 'poles at this K' },
      axisLines: true,
      minHalf: 3,
      maxHalf: 3.5,
      axes: { x: 'Re(s)', y: 'Im(s)' },
    }),

    figure(
      'step',
      line('step', {
        width: 2.5,
        label: 'y(t)',
        overlays: [hline(() => 1, { color: '#EDB120', dashed: true, width: 1.6, label: 'setpoint' })],
        // the frame is FIXED: a diverging response slams the edges instead of
        // rescaling them, so instability reads as an escape, not a zoom-out
        axes: { x: { label: 't', unit: 's' }, y: { label: 'y(t)', domain: [-1, 3] } },
      })
    ),
  ],
};
