import { float, int, select } from '../../../core/fields.js';
import { view, figure, line, stem, scatter, vline } from '../../../core/views.js';

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
      description: 'greedy pursuit read on the first three views',
      options: [
        { value: 'omp', label: 'OMP — refits every selected line' },
        { value: 'mp', label: 'MP — fits each line once' },
      ],
      default: 'omp',
    }),
    k: int('k', { description: 'iteration read', min: 0, max: 12, default: 3 }),
    // seed injected by the core, because random: true
  },

  groups: [
    { title: 'Signal', params: ['K', 'sep', 'snr'] },
    { title: 'Dictionary', params: ['over', 'offGrid'] },
    { title: 'Algorithm', params: ['algo', 'k'] },
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
