import { float, int, log, bool, select } from '../../../core/fields.js';
import { view, plane, line, stem, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'adaptive',
  order: 6,
  random: true, // entrée aléatoire et bruit de mesure
  title: 'Adaptive filtering',
  subtitle: 'LMS, NLMS, RLS — speed, accuracy, complexity: pick two',
  tags: ['adaptive', 'LMS', 'NLMS', 'RLS', 'stochastic gradient', 'identification'],

  params: {
    algo: select('algorithme', {
      options: [
        { value: 'lms', label: 'LMS — stochastic gradient' },
        { value: 'nlms', label: 'NLMS — normalized step' },
        { value: 'rls', label: 'RLS — recursive least squares' },
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
        { value: 2, label: '2 (the weight plane is then exact)' },
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
    track: bool('poursuite', {
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
    // THE ADAPTATION ITSELF, and that is why it comes first: the L coefficients
    // rising from zero towards their true values, and then dancing around them.
    // All the rest of the experiment is a summary of this drawing — the learning
    // curve is its quadratic version, the weight plane its geometric version at
    // L = 2. A single trace for the L trajectories (cut by NaNs), failing which
    // the legend would hold sixteen entries saying nothing.
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

    // THE view: the subject of the experiment IS the convergence, so it comes
    // to the front. Two curves, and it is their gap that instructs: the total
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
    plane('weights', 'Plan des poids', {
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
