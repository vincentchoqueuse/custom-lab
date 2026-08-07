import { float, int } from '../../../core/fields.js';
import { view, line, scatter, bars, density } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'galton-board',
  order: 5,
  random: true,
  title: 'The Galton board',
  subtitle: 'D rows of pegs, M balls — and the bell curve builds itself',
  tags: ['binomial', 'CLT', 'Galton', 'random walk', 'Pascal'],

  doc: `The most photographed object in statistics, computed. A ball falls
through D rows of pegs and bounces right with probability p at each one; the
bin it lands in counts its rights. Nothing else is going on — and that
nothing else is the whole point: D independent yes/no decisions in, a bell
silhouette out. The board view is the whole object, kept honest: B traced
balls zigzag through the pegs and EACH ONE lands as a dot stacked in its
bin — the pile is the histogram of exactly the trajectories on screen,
nothing invisible feeds it. Raising B drops more balls and the bell builds
itself, one visible ball at a time. The histogram view then does the
statistics at scale: M balls against the law.

The bins fill as an exact Binomial(D, p), drawn from its closed form over
the measured bars: the pegs write Pascal's triangle without being told to.
On top of it sits the Gaussian N(Dp, Dp(1−p)) the central limit theorem
promises, and the statline measures the worst gap between the two. At
D = 24 the promise is nearly kept; dropping D to 4 shows how little it
takes to break it.

The bias pill is the honest coda. At p = 0.2 the binomial is visibly
skewed — the machine has no obligation to be symmetric — and the Gaussian,
which is, misses worst in the tail: exactly where rare events live, which
is where Gaussian approximations are least entitled to be trusted. The
sequel is one module over: the central limit theorem experiment does the
same convergence with draws that are not coin flips at all.`,

  params: {
    D: int('D', { description: 'rows of pegs', min: 3, max: 24, default: 12 }),
    B: int('B', {
      description: 'balls traced through the board view — each lands in the pile',
      min: 1,
      max: 60,
      default: 10,
    }),
    M: int('M', {
      description: 'balls dropped',
      min: 100,
      max: 20000,
      step: 100,
      default: 3000,
    }),
    p: float('p', {
      description: 'probability of bouncing right at a peg',
      min: 0.2,
      max: 0.8,
      step: 0.05,
      default: 0.5,
      precision: 2,
    }),
    // no seed here: injected by the core
  },

  groups: [
    { title: 'The board', params: ['D', 'p'] },
    { title: 'The drop', params: ['B', 'M'] },
  ],

  views: [
    view(
      'board',
      'The board, and a few balls',
      scatter('pegs', {
        color: 'var(--muted-fg)',
        size: 3,
        label: 'pegs',
        overlays: [
          line('paths', { width: 1.5, opacity: 0.6, label: 'trajectories' }),
          // every traced ball ends as a dot stacked in its bin: the pile IS
          // the histogram of exactly the trajectories on screen
          scatter('pile', { color: '#0072BD', size: 5.5, label: 'the pile' }),
        ],
        axes: { x: 'lateral position', y: 'row' },
      })
    ),

    view(
      'histogram',
      'M balls against the binomial',
      bars('landing', {
        label: 'measured share',
        overlays: [
          scatter('binomial', { color: '#D95319', size: 5, label: 'Binomial(D, p) — exact' }),
          density('gaussian', { color: '#7E2F8E', width: 2, label: 'Gaussian N(Dp, Dp(1−p))' }),
        ],
        axes: { x: 'k — bounces right', y: 'probability' },
      })
    ),
  ],
};
