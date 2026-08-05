import { float, int, log, select } from '../../../core/fields.js';
import { view, figure, line, stem, scatter, vline, hline } from '../../../core/views.js';

/** The true frequencies, as verticals — the same on the two frequency views,
 *  declared once so that they cannot drift apart. A line beyond K comes back
 *  NaN from the compute and simply does not draw. */
const TRUTH = [
  vline('fTrue1', { color: '#EDB120', dashed: true, width: 1.6, label: 'true lines' }),
  vline('fTrue2', { color: '#EDB120', dashed: true, width: 1.6 }),
  vline('fTrue3', { color: '#EDB120', dashed: true, width: 1.6 }),
  vline('fTrue4', { color: '#EDB120', dashed: true, width: 1.6 }),
  vline('fTrue5', { color: '#EDB120', dashed: true, width: 1.6 }),
];

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'sparse-recovery',
  order: 5, // straight after frequency-estimation, which it generalizes
  random: true, // noise and phases are drawn
  title: 'Sparse recovery',
  subtitle: 'More unknowns than samples — and a greedy algorithm that picks the few that matter',
  tags: ['sparsity', 'matching pursuit', 'OMP', 'dictionary', 'greedy', 'coherence', 'CLEAN'],

  params: {
    K: int('K', { description: 'true lines in the signal', min: 1, max: 5, default: 3 }),
    sep: float('Δf', {
      description: 'separation of the first two lines',
      min: 0.5,
      max: 8,
      step: 0.25,
      default: 3,
      unit: 'cells',
      precision: 2,
    }),
    offGrid: float('δ', {
      description: 'offset of the lines from the grid (½ = worst case)',
      min: 0,
      max: 0.5,
      step: 0.05,
      default: 0,
      unit: 'cell',
      precision: 2,
    }),
    over: select('grid', {
      description: 'candidate frequencies per Fourier cell',
      options: [
        { value: 1, label: '×1 — one atom per cell' },
        { value: 2, label: '×2' },
        { value: 4, label: '×4' },
        { value: 8, label: '×8 — 513 atoms for 128 samples' },
      ],
      default: 2,
    }),
    snr: float('SNR', {
      description: 'signal-to-noise ratio',
      min: 0,
      max: 60,
      step: 1,
      default: 15, // low enough that the noise is VISIBLE on the time view
      unit: 'dB',
      precision: 0,
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
      default: 3,
      visibleIf: { algo: ['omp', 'mp'] },
    }),
    lam: log('λ', {
      // as a FRACTION of λmax = ‖Dᵀx‖∞, so the pill means the same thing at any
      // amplitude or noise level, and λ = λmax is exactly where c becomes zero
      description: 'penalty, as a fraction of the λ that zeroes everything',
      min: 1e-3,
      max: 1,
      default: 0.1,
      precision: 4,
      visibleIf: { algo: 'lasso' },
    }),
    alpha: float('α', {
      // The FISTA step, as a multiple of the certified 1/‖DᵀD‖. A knob and not
      // a constant on purpose: α = 1 is what the convergence proof requires,
      // and it is NOT the fastest — the useful lesson is the gap between a
      // guarantee and an optimum, and the edge where the guarantee stops being
      // optional.
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

  groups: [
    { title: 'Signal', params: ['K', 'sep', 'snr'] },
    { title: 'Dictionary', params: ['over', 'offGrid'] },
    { title: 'Algorithm', params: ['algo', 'k', 'lam', 'alpha'] },
  ],

  derived: {
    // What decides whether the problem is hard, computed where the room can
    // check it: 128 samples against however many columns the grid has.
    shape: {
      label: 'D is 128 ×',
      calc: (p) => `${2 * (64 * p.over + 1)} columns — ${p.over > 1 ? 'underdetermined' : 'square'}`,
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
      'fit',
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
            baseline: -60,
            label: 'recovered lines',
          }),
          // lasso only: the same support refitted by plain least squares. The
          // gap between the two stems IS the shrinkage the penalty costs, and
          // closing it is what debiasing means.
          stem('debiased', {
            color: '#77AC30',
            size: 4,
            width: 1.6,
            baseline: -60,
            label: 'debiased (LS refit)',
          }),
          ...TRUTH,
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: 'magnitude', unit: 'dB', domain: [-60, 5] },
        },
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
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: 'correlation', unit: 'dB', domain: [-60, 5] },
        },
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
