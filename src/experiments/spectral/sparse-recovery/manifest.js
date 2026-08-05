import { float, int, log, select } from '../../../core/fields.js';
import { view, figure, line, stem, scatter, vline, hline } from '../../../core/views.js';
import { fWindow } from '../_lib/frame.js';

/** The SAME frequency window as spectral/subspace, from the same module. The
 *  two experiments are meant to be read one after the other on the same pair of
 *  lines, and a frame that differed by a few hertz would make them look like
 *  different signals. */
const F_AXIS = { label: 'f', unit: 'Hz', domain: fWindow };

/** The true frequencies, as verticals — the same on the two frequency views,
 *  declared once so that they cannot drift apart. A line beyond K comes back
 *  NaN from the compute and simply does not draw. */
const TRUTH = [
  vline('fTrue1', { color: '#EDB120', dashed: true, width: 1.6, label: 'true lines' }),
  vline('fTrue2', { color: '#EDB120', dashed: true, width: 1.6 }),
  vline('fTrue3', { color: '#EDB120', dashed: true, width: 1.6 }),
];

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'sparse-recovery',
  // Straight after the high-resolution methods, and that order is the argument:
  // MUSIC and ESPRIT are HANDED the number of lines, this one is not. The same
  // signal, the same window, the same decibels — and the question the previous
  // experiment left open.
  order: 5,
  random: true, // noise and phases are drawn
  title: 'Sparse recovery',
  subtitle: 'The same two lines — but nobody says how many there are',
  tags: ['sparsity', 'matching pursuit', 'OMP', 'lasso', 'dictionary', 'greedy', 'coherence', 'CLEAN'],

  params: {
    // The first five are spectral/subspace's own parameters, with the same
    // names, the same units and the same defaults, so that switching between
    // the two experiments changes the METHOD and nothing else.
    sources: select('sources', {
      description: 'number of lines actually present — and NOT given to the algorithm',
      options: [
        { value: 2, label: '2 (two close lines)' },
        { value: 3, label: '3 (+ one line further off)' },
      ],
      default: 2,
    }),
    df: float('Δf', {
      description: 'gap between the two lines, in units of the Fourier limit Fs/N',
      min: 0.05,
      max: 3,
      step: 0.05,
      // 1.5 and not the neighbour's 0.5: a greedy pursuit needs the lines to be
      // resolved by the DICTIONARY, and 0.5 is exactly where it fails while
      // MUSIC succeeds. That comparison is a scene, not the landing state.
      default: 1.5,
      precision: 2,
    }),
    snr: float('SNR', {
      description: 'signal-to-noise ratio per line',
      min: -10,
      max: 50,
      step: 1,
      default: 25,
      unit: 'dB',
      precision: 0,
    }),
    N: select('N', {
      description: 'record length (Fs = 1 kHz)',
      options: [
        { value: 128, label: '128' },
        { value: 256, label: '256' },
        { value: 512, label: '512' },
      ],
      default: 256,
    }),
    over: select('grid', {
      description: 'candidate frequencies per Fourier cell',
      options: [
        { value: 1, label: '×1 — one atom per cell' },
        { value: 2, label: '×2' },
        { value: 4, label: '×4' },
      ],
      default: 2,
    }),
    offGrid: float('δ', {
      description: 'offset of the lines from the search grid (½ = worst case)',
      min: 0,
      max: 0.5,
      step: 0.05,
      default: 0,
      unit: 'cell',
      precision: 2,
    }),
    algo: select('algorithm', {
      description: 'how the sparsity is imposed',
      options: [
        { value: 'omp', label: 'OMP — greedy, k atoms, refits each time' },
        { value: 'mp', label: 'MP — greedy, k atoms, fits each once' },
        { value: 'lasso', label: 'lasso — convex, penalty λ‖c‖₁' },
      ],
      default: 'omp',
    }),
    // The two knobs are NOT interchangeable and the drawer says so by showing
    // one at a time: a greedy method constrains the NUMBER of atoms and its
    // knob is k, while the convex relaxation penalizes the amplitudes and its
    // knob is λ. Same objective, two roads, two dials.
    k: int('k', {
      description: 'iteration read — greedy only',
      min: 0,
      max: 12,
      default: 2,
      visibleIf: { algo: ['omp', 'mp'] },
    }),
    lam: log('λ', {
      description: 'penalty, as a fraction of the λ that zeroes everything',
      min: 1e-3,
      max: 1,
      default: 0.1,
      precision: 4,
      visibleIf: { algo: 'lasso' },
    }),
    alpha: float('α', {
      description: 'FISTA step, in units of the certified 1/L',
      min: 0.25,
      max: 2,
      step: 0.05,
      default: 1,
      precision: 2,
      visibleIf: { algo: 'lasso' },
    }),
    // seed injected by the core, because random: true
  },

  validate: [
    {
      // FISTA runs two transforms of length N·over per iteration; past 1024 the
      // solve leaves the range where a slider can be dragged.
      when: (p) => p.N * p.over > 1024,
      message: 'N × grid must stay ≤ 1024 to keep the solver responsive',
    },
  ],

  groups: [
    { title: 'Signal', params: ['sources', 'df', 'snr', 'N'] },
    { title: 'Dictionary', params: ['over', 'offGrid'] },
    { title: 'Algorithm', params: ['algo', 'k', 'lam', 'alpha'] },
  ],

  derived: {
    // The two numbers that decide whether the problem is hard, next to each
    // other: the Fourier limit the neighbouring experiment beats, and the shape
    // of the system this one has to solve.
    fourierLimit: { label: 'Fourier limit Fs/N', calc: (p) => `${(1000 / p.N).toFixed(2)} Hz` },
    shape: {
      label: 'D is N ×',
      calc: (p) =>
        `${2 * ((p.N * p.over) / 2 + 1)} columns for ${p.N} samples — ` +
        `${p.over > 1 ? 'underdetermined' : 'square'}`,
    },
  },

  views: [
    // The subject leads with the fit, and so does this one — with THREE traces,
    // because two would not settle the question. The measured data in grey, the
    // clean signal it came from in orange, and what k lines rebuild in blue.
    // What matters is which of the two the blue lands on: a fit that followed
    // the grey would have fitted the noise, and the point of a sparse model is
    // that it cannot. The statline reads that as an SNR the room can compare
    // with the one it dialled in.
    figure(
      'time',
      line('signal', {
        color: '#a1a1aa',
        width: 1.1,
        label: 'measured (noisy)',
        overlays: [
          line('clean', { color: '#D95319', width: 1.6, dashed: true, label: 'clean signal' }),
          line('reco', { color: '#0072BD', width: 2.2, label: 'denoised — k lines' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: { label: 'x(t)' } },
      })
    ),

    // The answer: a few spikes where the periodogram has fat lobes. The stems
    // stand on the dB floor and their tops land on the peaks they explain.
    figure(
      'spectrum',
      line('periodogram', {
        color: '#a1a1aa',
        width: 1.4,
        label: 'periodogram',
        overlays: [
          stem('spikes', {
            color: '#0072BD',
            size: 5,
            width: 2,
            baseline: -80,
            label: 'recovered lines',
          }),
          // lasso only: the same support refitted by plain least squares. The
          // gap between the two stems IS the shrinkage the penalty costs, and
          // closing it is what debiasing means.
          stem('debiased', {
            color: '#77AC30',
            size: 4,
            width: 1.6,
            baseline: -80,
            label: 'debiased (LS refit)',
          }),
          ...TRUTH,
        ],
        axes: { x: F_AXIS, y: { label: '|X(f)|', unit: 'dB', domain: [-80, 5] } },
      })
    ),

    // WHAT THE ALGORITHM SEES at iteration k, which is the whole point: the
    // correlation with every atom at once — one zero-padded FFT — and the peak
    // it is about to take. On OMP the curve carries an exact notch at every
    // line already chosen; that notch IS the orthogonality, drawn.
    view(
      'correlations',
      'What the algorithm sees',
      line('correlation', {
        color: '#7E2F8E',
        width: 1.6,
        label: '|⟨residual, atom⟩| at step k',
        overlays: [
          scatter('pickMark', { color: '#D95319', size: 11, label: 'atom taken at step k' }),
          // lasso only: the KKT cap. The correlation may not exceed λ anywhere,
          // and touches it exactly on the active lines — the convex method's
          // stopping condition, drawn, next to the greedy's notches.
          hline('lambdaLine', { color: '#77AC30', dashed: true, width: 1.8, label: 'λ' }),
          ...TRUTH,
        ],
        axes: { x: F_AXIS, y: { label: 'correlation', unit: 'dB', domain: [-80, 5] } },
      })
    ),

    // The two algorithms on the same axes. On grid they fall together; off grid
    // or with coherent atoms, OMP keeps going down and MP stalls.
    view(
      'convergence',
      'Residual vs iteration',
      line('resOmp', {
        color: '#0072BD',
        width: 2.2,
        label: 'OMP',
        overlays: [line('resMp', { color: '#D95319', width: 2, dashed: true, label: 'MP' })],
        axes: {
          x: { label: 'iteration' },
          y: { label: 'residual energy', unit: 'dB', domain: [-70, 5] },
        },
      })
    ),
  ],
};
