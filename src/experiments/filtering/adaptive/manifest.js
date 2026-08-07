import { float, int, log, bool, select } from '../../../core/fields.js';
import { view, plane, stack, line, stem, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'adaptive',
  order: 6,
  random: true, // random input and measurement noise
  title: 'Adaptive filtering',
  subtitle: 'LMS, NLMS, RLS — speed, accuracy, complexity: pick two',
  tags: ['adaptive', 'LMS', 'NLMS', 'RLS', 'stochastic gradient', 'identification'],

  doc: `A filter that starts from zero, never sees the unknown system, and is
driven by one signal only: its own error. Walking the iterations forward
shows the output climb onto the reference and the error collapse toward the
noise floor it can never cross — that is the whole of adaptive filtering,
and every other view is a summary of it.

The step size is ONE law, not two: doubling μ descends faster and lands on
a plateau higher by μ·tr(R)/(2 − μ·tr(R)), measured and theoretical landing
within a few per cent of each other. The divergence threshold is the finer
lesson: the textbook bound 2/tr(R) makes the MEAN converge, but the
variance decides, and the measured explosion at 0.195 sits on the
variance condition, not the textbook one. On a correlated input the real
threshold falls far below what the theory announces — which is why NLMS,
whose dimensionless step is bounded by 2 whatever the input power, is what
practice actually uses.

Colouring the input at identical power slows LMS three and a half times —
conditioning λmax/λmin is the culprit, each eigenmode converging at its own
rate with the slowest holding everyone up, the descent zigzagging where it
used to dive. RLS inverts R instead of following it and converges in
fifteen iterations regardless — at L² operations per sample instead of L.
And when the system jumps mid-run the hierarchy inverts: RLS with λ = 1
has infinite memory and never catches up, forgetting (λ = 0.99) buys
tracking at the price of the plateau, and plain LMS with a large step
nearly hides the jump altogether. The dumbest of the three is the best
when the world moves — measured, not asserted.`,


  params: {
    algo: select('algorithm', {
      description: 'adaptive rule updating the coefficients',
      options: [
        { value: 'lms', label: 'LMS' },
        { value: 'nlms', label: 'NLMS' },
        { value: 'rls', label: 'RLS' },
      ],
      default: 'lms',
    }),
    mu: log('μ', {
      description: 'adaptation step (normalized, in ]0, 2[, for NLMS)',
      min: 1e-3,
      max: 1.5,
      default: 0.01,
      precision: 4,
      visibleIf: { algo: ['lms', 'nlms'] },
    }),
    lambda: float('λ', {
      description: 'forgetting factor — 1 means infinite memory',
      min: 0.95,
      max: 1,
      step: 0.001,
      default: 1,
      precision: 3,
      visibleIf: { algo: 'rls' },
    }),
    L: select('L', {
      description: 'filter length (and length of the system to identify)',
      options: [
        { value: 2, label: '2 — exact weight plane' },
        { value: 4, label: '4' },
        { value: 8, label: '8' },
        { value: 16, label: '16' },
      ],
      default: 8,
    }),
    a: float('a', {
      description: 'colour of the input — AR(1), at constant variance',
      min: 0,
      max: 0.95,
      step: 0.05,
      default: 0,
      precision: 2,
    }),
    snr: float('SNR', {
      description: 'measurement signal-to-noise ratio',
      min: 0,
      max: 40,
      step: 1,
      default: 20,
      unit: 'dB',
      precision: 0,
    }),
    n: int('n', {
      description: 'iteration observed — the dial that replaces an animation',
      min: 1,
      max: 3000,
      step: 1,
      default: 3000,
    }),
    track: bool('tracking', {
      description: 'the system jumps at iteration 1500',
      default: false,
    }),
    // seed injected by the core, because random: true
  },

  derived: {
    // What the room should be able to check in its head before moving the step size.
    bound: { label: 'stability bound 2/tr(R)', calc: (p) => (2 / p.L).toFixed(4) },
    cond: {
      label: 'target conditioning (L → ∞)',
      calc: (p) => (((1 + p.a) / (1 - p.a)) ** 2).toFixed(1),
    },
  },

  groups: [
    { title: 'Algorithm', params: ['algo', 'mu', 'lambda', 'L'] },
    { title: 'Signal', params: ['a', 'snr', 'track'] },
    { title: 'Observation', params: ['n'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // WHAT THE ALGORITHM IS WORKING ON, and it comes first because every other
    // tab is a summary of it: the learning curve is these two traces squared
    // and averaged, the weight tracks are what their difference did to ŵ, the
    // weight plane is the same story with the iterations thrown away. Read in
    // the other order the experiment shows coefficients converging towards
    // values, with no visible sign of what made them move.
    //
    // Two panels over one iteration axis: above, the reference d(n) the filter
    // is chasing and the output y(n) it produces; below, the error that drives
    // every single update. Sliding n walks the window forward and the two
    // traces close on each other while the error collapses onto zero — the
    // adaptation, on the signals rather than on a statistic of them.
    stack(
      'signals',
      'Reference and output',
      [
        line('refSig', {
          color: '#D95319',
          width: 2,
          dashed: true,
          label: 'reference d(n)',
          overlays: [line('outSig', { color: '#0072BD', width: 1.6, label: 'filter output y(n)' })],
          axes: { y: 'amplitude' },
        }),
        line('errSig', {
          color: '#7E2F8E',
          width: 1.4,
          label: 'error e(n) = d − y',
          overlays: [hline(() => 0, { color: '#a1a1aa', width: 1, dashed: true })],
          axes: { y: 'error' },
        }),
      ],
      { axes: { x: { label: 'iteration' } } }
    ),

    // THE ADAPTATION ITSELF: the L coefficients rising from zero towards their
    // true values, and then dancing around them — the previous tab's error,
    // seen from the other side. A single trace for the L trajectories (cut by
    // NaNs), failing which the legend would hold sixteen entries saying
    // nothing.
    view(
      'tracks',
      'Weights ŵ(n)',
      line('wRefs', {
        color: '#D95319',
        width: 1.4,
        dashed: true,
        label: 'true values w*ₖ',
        overlays: [line('wTracks', { color: '#0072BD', width: 1.4, label: 'ŵₖ(n)' })],
        axes: { x: { label: 'iteration' }, y: { label: 'coefficient' } },
      })
    ),

    // The convergence as a STATISTIC — e² averaged over 24 realizations, which
    // is the quantity theory predicts and no single run shows.
    // Two curves, and it is their gap that instructs: the total
    // MSE (what would really be measured, noise included) and the excess w̃ᵀRw̃
    // (what the adaptation controls, without the noise). The first never
    // descends below the floor; the second says how far from w* one is.
    view(
      'learning',
      'Learning curve',
      line('learning', {
        color: '#0072BD',
        width: 1.6,
        label: 'MSE E[e²]',
        overlays: [
          line('excess', { color: '#D95319', width: 2, label: 'excess w̃ᵀRw̃' }),
          hline('floorDb', { color: '#EDB120', dashed: true, width: 1.6, label: 'floor σ²' }),
          hline('plateauDb', { color: '#77AC30', dashed: true, width: 1.6, label: 'plateau reached' }),
          vline('switchLine', { color: '#7E2F8E', width: 1.6, label: 'system jump' }),
          vline('nLine', { color: '#71717a', dashed: true, width: 1.2, label: 'iteration n' }),
        ],
        axes: {
          x: { label: 'iteration', scale: 'log' },
          y: { label: 'MSE', unit: 'dB', domain: [-45, 15] },
        },
      })
    ),

    // What the filter has learned, at iteration n: the estimated impulse
    // response against the true one. This is where the filter is seen "filling
    // in" coefficient by coefficient, and jumping when the system jumps.
    view(
      'coeffs',
      'Coefficients',
      stem('tapsTrue', {
        color: '#0072BD',
        size: 6,
        label: 'system w*',
        overlays: [stem('taps', { color: '#D95319', size: 4, label: 'filter ŵ(n)' })],
        axes: { x: { label: 'k' }, y: { label: 'coefficient' } },
      })
    ),

    // The geometry, and the only way to SEE why a coloured input costs: at
    // L = 2 the iso-contours of the cost are ellipses whose axes are the
    // eigenvectors of R, and the descent crosses them in a zigzag as they
    // elongate. An equal-aspect plane, otherwise the ellipses would lie about
    // their elongation — exactly the use case of `plane`.
    plane('weights', 'The weight plane', {
      curves: [
        { source: 'contour1', color: '#71717a', width: 1, label: 'cost contour' },
        { source: 'contour2', color: '#71717a', width: 1 },
        { source: 'contour3', color: '#71717a', width: 1 },
        { source: 'wTrack', color: '#0072BD', width: 1.8, label: 'descent ŵ(0…n)' },
      ],
      clouds: [{ source: 'wStart', color: '#7E2F8E', r: 5, label: 'start ŵ = 0' }],
      markers: { source: 'wOpt', color: '#D95319', label: 'optimum w*' },
      axisLines: true,
      symmetric: false,
      axes: { x: 'w₀', y: 'w₁' },
    }),
  ],
};
