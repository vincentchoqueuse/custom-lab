import { float, select, coeffs } from '../../../core/fields.js';
import { line, hline, vline, scatter, figure } from '../../../core/views.js';
import { gainView, phaseView, polesView, GUIDE_COLOR } from '../../../core/response-views.js';
import { naturalPulsation } from '../_lib/bode.js';

/** The measured point and the pulsation it was measured at — the same two
 *  overlays on both halves of the Bode plot, declared once. */
const MEASURED = (source, label) => [
  vline('wMeas', { color: '#EDB120', dashed: true, width: 1.6, label: 'ω of the sine' }),
  scatter(source, { color: '#D95319', size: 9, label }),
];

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'lti-response',
  order: 3,
  title: 'Response of an arbitrary LTI system',
  subtitle: 'Type num and den, choose the input — step, ramp or sinusoid',
  tags: ['LTI', 'transfer function', 'step', 'ramp', 'steady state'],

  doc: `A transfer function typed by hand — num and den as coefficients in
decreasing powers of s, carried in the URL so any system invented at the
bench reaches the whole room as one link — and its responses. The step
answers first: 1/(s+1)² is clean and slow, den = 1,0.4,1 rings, a zero adds
overshoot, and the final value is the static gain num(0)/den(0).

The ramp is a stopwatch: with unit static gain the output follows with a
constant lag equal to the SUM of the time constants — 2 s for 1/(s+1)²,
3 for three poles at −1 — and a zero brings it back down: zeros produce
phase lead, literally. Break the static gain and the lag stops settling,
opening as (1−H(0))·t.

The sine is the living definition of H(jω): after the transient the output
is a sinusoid at the same frequency, of amplitude |H(jω)| and shifted by
its argument, the measured gain agreeing with the computed one to three
decimals. Raising f traces a Bode plot point by point, by hand. And the
pole view is where everything is decided: sliding a pole toward the axis
makes the ringing appear, across it the statline reads "unstable" — the
crossing visible on the plane a second before it is visible in time.`,


  params: {
    num: coeffs('num', {
      description: 'numerator of H(s), decreasing powers',
      default: [1],
    }),
    den: coeffs('den', {
      description: 'denominator of H(s), decreasing powers',
      default: [1, 2, 1],
    }),
    input: select('input', {
      description: 'signal applied at t = 0',
      options: [
        { value: 'step', label: 'step' },
        { value: 'ramp', label: 'unit ramp' },
        { value: 'sine', label: 'sinusoid' },
      ],
      default: 'step',
    }),
    f: float('f', {
      description: 'frequency of the sinusoid',
      min: 0.2,
      max: 2,
      step: 0.05,
      default: 0.5,
      unit: 'Hz',
      precision: 2,
      visibleIf: { input: 'sine' },
    }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  validate: [
    { when: (p) => Math.abs(p.den[0]) < 1e-12, message: 'den[0] cannot be zero' },
    {
      when: (p) => p.num.length > p.den.length,
      message: 'Non-causal system: deg(num) must stay ≤ deg(den)',
    },
  ],

  derived: {
    order: { label: 'order of the system', calc: (p) => p.den.length - 1 },
    type: {
      label: 'type (integrators)',
      calc: (p) => {
        let t = 0;
        for (let i = p.den.length - 1; i >= 0 && p.den[i] === 0; i--) t++;
        return t;
      },
    },
  },

  groups: [
    { title: 'System H(s)', params: ['num', 'den'] },
    { title: 'Input', params: ['input', 'f'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    figure(
      'response',
      line('output', {
        width: 2.4,
        label: 'output y(t)',
        overlays: [
          line('inputSignal', { color: '#a1a1aa', width: 1.6, dashed: true, label: 'input u(t)' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'y(t)' },
      })
    ),

    // Impulse response — the same tab, in the same place, as in First-order
    // response and Second-order response: a listener who arrives at "an
    // arbitrary system" after those two finds the five readings they already
    // know, on a transfer function they typed in themselves.
    // A bi-proper system (deg num = deg den) also carries a Dirac at t = 0;
    // its weight is in the statline, since an arrow of infinite height is
    // not something a plot can honestly draw.
    figure(
      'impulse',
      line('impulseResponse', {
        color: '#0072BD',
        width: 2.5,
        label: 'h(t) — continuous part',
        overlays: [
          vline((p) => (p.num.length === p.den.length ? 0 : NaN), {
            color: '#D95319',
            width: 2,
            label: 'Dirac',
          }),
          hline(() => 0, { color: GUIDE_COLOR, width: 1 }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'h(t)' },
      })
    ),

    // Poles and zeros of whatever was typed in — the roots are found
    // numerically (_lib/lti.js, Durand–Kerner) because the coefficients are
    // free. This is the view that ANSWERS the two above: a root crossing
    // into the right half-plane is the divergence, seen before it is
    // simulated. The frame follows the characteristic pulsation read off the
    // denominator, so a system typed with any coefficients arrives framed.
    polesView({
      poleLabel: 'poles of den(s)',
      zeroLabel: 'zeros of num(s)',
      minHalf: (p) => {
        const wn = naturalPulsation(p.den);
        return Number.isFinite(wn) && wn > 0 ? 1.6 * wn : 2;
      },
      maxHalf: 60,
    }),

    // The Bode pair — same builders, same titles, same order as everywhere
    // else in the subject. It is more than uniformity here: the experiment
    // CLAIMS that the gain and phase fitted on the steady-state sine ARE
    // |H(jω)| and arg H(jω), and this is where that claim becomes visible —
    // the measured point lands on the theoretical curve, or the claim is
    // wrong. The grid is centred on the pulsation read off the denominator
    // coefficients, so any typed-in system arrives framed on its own decades.
    gainView('gain', {
      overlays: MEASURED('gainPoint', 'measured gain'),
    }),

    phaseView('phase', {
      overlays: MEASURED('phasePoint', 'measured phase'),
    }),
  ],
};
