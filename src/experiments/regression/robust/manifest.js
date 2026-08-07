import { float, int, select } from '../../../core/fields.js';
import { view, figure, line, scatter, hline, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'robust',
  // Straight after linear regression, whose outlier slider ends on "least
  // squares has no defence against it". This is the defence.
  order: 2,
  random: true,
  title: 'Robust regression',
  subtitle: 'One point far enough out decides the line — L1, Huber and RANSAC say no',
  tags: ['robust', 'outliers', 'L1', 'Huber', 'RANSAC', 'breakdown point', 'leverage'],
  doc: `Least squares minimises the sum of SQUARED residuals, and the square is
        the whole problem: a residual twice as large weighs four times as much,
        so a point far enough out decides the line by itself. This experiment
        measures that rather than asserting it — the least-squares slope is an
        exact affine function of the outlier's offset — and then replaces the
        square by three other costs.

        L1 charges every residual its absolute value, so a distant point weighs
        no more per unit than a near one. Huber is quadratic near zero and
        linear beyond δ: efficiency on clean data, resistance far out. RANSAC
        stops counting a point altogether once it leaves the band, which is
        what buys a breakdown point of one half — the largest any estimator can
        have.

        The breakdown view reads that number more carefully than the textbook
        does. Contaminated points SCATTERED over the range are not a set but
        many sets of one, and RANSAC still returns the clean line past
        ε = 0.5; the cliff appears only when the bad points are pushed
        together onto a line of their own and become the majority. A breakdown
        point is not "how many outliers" but "how many ORGANISED outliers".

        Nothing here is free, and the last scene prices it: on clean Gaussian
        data L1 keeps about 64 % of the efficiency of least squares, Huber
        with δ ≈ 1.5σ about 95 % — the insurance premium — while RANSAC's
        band has to be chosen, and choosing it needs to know the noise.`,

  params: {
    a: float('a', { description: 'true slope', min: -3, max: 3, step: 0.1, default: 1.5 }),
    b: float('b', { description: 'true intercept', min: -5, max: 5, step: 0.2, default: 1 }),
    sigma: float('σ', {
      description: 'noise standard deviation',
      min: 0,
      max: 3,
      step: 0.1,
      default: 0.7,
      precision: 1,
    }),
    N: int('N', { description: 'number of observed points', min: 5, max: 200, default: 40 }),
    spread: float('L', {
      description: 'half-range of the abscissas (x runs from −L to +L)',
      min: 0.5,
      max: 6,
      step: 0.1,
      default: 3,
      precision: 1,
    }),
    contam: float('ε', {
      description: 'fraction of the points that are contaminated',
      min: 0,
      max: 0.6,
      step: 0.025,
      default: 0.05,
      precision: 3,
    }),
    shift: float('Δy', {
      description: 'how far the contaminated points are pushed',
      min: -20,
      max: 20,
      step: 0.5,
      default: 12,
      precision: 1,
    }),
    pattern: select('structure', {
      description: 'whether the contaminated points agree with each other',
      options: [
        { value: 'scatter', label: 'scattered' },
        { value: 'block', label: 'pushed together' },
      ],
      default: 'scatter',
    }),
    method: select('method', {
      description: 'what replaces the square',
      options: [
        { value: 'huber', label: 'Huber' },
        { value: 'l1', label: 'L1' },
        { value: 'ransac', label: 'RANSAC' },
      ],
      default: 'huber',
    }),
    delta: float('δ', {
      description: 'Huber threshold, where the cost stops being quadratic',
      min: 0.1,
      max: 8,
      step: 0.1,
      default: 1.5,
      precision: 1,
      visibleIf: { method: 'huber' },
    }),
    thr: float('γ', {
      description: 'RANSAC inlier band, in units of y',
      min: 0.2,
      max: 6,
      step: 0.1,
      default: 1.5,
      precision: 1,
      visibleIf: { method: 'ransac' },
    }),
    // seed injected by the core, because random: true
  },

  validate: [
    { when: (p) => p.contam * p.N >= p.N - 2, message: 'at least two clean points are needed' },
  ],

  derived: {
    // What the room should be able to predict before the offset is touched.
    outliers: { label: 'contaminated points', calc: (p) => `${Math.round(p.contam * p.N)} of ${p.N}` },
    // L1 and Huber bound the cost of a residual, which is not the same as
    // ignoring it: one point with enough leverage still carries the line, so
    // their breakdown point in REGRESSION is 0 however good they look here.
    // Only rejecting a point outright buys the 1/2.
    breakdown: {
      label: 'breakdown point',
      calc: (p) =>
        p.method !== 'ransac'
          ? '0 with enough leverage'
          : p.pattern === 'block'
            ? '1/2 — the maximum possible'
            : 'past 1/2: scattered outliers form no consensus',
    },
  },

  groups: [
    { title: 'True line', params: ['a', 'b'] },
    { title: 'Observations', params: ['N', 'sigma', 'spread'] },
    { title: 'Contamination', params: ['contam', 'shift', 'pattern'] },
    { title: 'Estimator', params: ['method', 'delta', 'thr'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // The subject leads with the fit. Two lines on it and not four: the one
    // that fails and the one the pill selects, exactly as polynomial-regression
    // shows LS beside ridge. Four estimators at once would be a legend to read
    // rather than a comparison to make.
    figure(
      'fit',
      scatter('clean', {
        color: '#7E2F8E',
        size: 3.8,
        opacity: 0.8,
        label: 'observations',
        overlays: [
          scatter('outliers', { color: '#D95319', size: 5.5, label: 'contaminated' }),
          line('truth', { color: '#EDB120', width: 1.6, dashed: true, label: 'true line' }),
          line('fitOls', { color: '#0072BD', width: 2.4, label: 'least squares' }),
          line('fitRobust', { color: '#77AC30', width: 2.4, label: 'robust fit' }),
        ],
        axes: { x: 'x', y: 'y' },
      })
    ),

    // WHY, in one figure. Everything the experiment demonstrates is the shape
    // of these four curves far from zero: unbounded, linear, linear past δ, and
    // flat. A room that has read this tab can predict every other one.
    view(
      'loss',
      'What a residual costs',
      line('lossOls', {
        color: '#0072BD',
        width: 2.4,
        label: 'least squares — r²/2',
        overlays: [
          line('lossL1', { color: '#D95319', width: 2, label: 'L1 — |r|' }),
          line('lossHuber', { color: '#77AC30', width: 2.4, label: 'Huber — r²/2 then δ|r|' }),
          line('lossRansac', { color: '#7E2F8E', width: 2, dashed: true, label: 'RANSAC — in or out' }),
        ],
        axes: { x: 'residual r', y: 'ρ(r) — what it costs' },
      })
    ),

    // The breakdown, measured: the same sample with the offset swept, and how
    // far each fitted LINE ends up from the true one. Reading the SLOPE here
    // was the first version and it was wrong — outliers pushed together sit on
    // a parallel line, so the slope stays perfect while the fit has moved
    // bodily off the data, and the figure showed a flat green line exactly
    // where the scene says the method breaks.
    view(
      'breakdown',
      'How far the line ends up',
      line('sweepOls', {
        color: '#0072BD',
        width: 2.4,
        label: 'least squares',
        overlays: [
          line('sweepRobust', { color: '#77AC30', width: 2.4, label: 'robust fit' }),
          hline('zeroLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'the true line' }),
          vline('shiftLine', { color: '#71717a', dashed: true, width: 1.2, label: 'current offset' }),
        ],
        axes: { x: 'offset applied to the contaminated points', y: 'worst gap to the true line' },
      })
    ),
  ],
};
