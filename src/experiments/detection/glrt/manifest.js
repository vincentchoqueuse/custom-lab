import { int, log, select } from '../../../core/fields.js';
import { view, line, scatter, band, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'glrt',
  // Third, because it is the invoice for the first two: Neyman–Pearson assumes
  // the signal known and the matched filter builds it, and this one takes that
  // knowledge away one item at a time.
  order: 3,
  random: true,
  title: 'When the signal is not known',
  subtitle: 'GLRT, the energy detector and CFAR — what each missing piece costs',
  tags: ['GLRT', 'energy detector', 'radiometer', 'CFAR', 'chi-square', 'ROC'],
  doc: `Neyman–Pearson needs the signal known down to its amplitude and the
        noise power known. Real detection almost never has that, and every
        missing piece produces a different test with a different law.

        Not knowing the AMPLITUDE costs about a decibel and a half: the
        likelihood ratio is maximised over A, which squares the matched-filter
        statistic and turns a Gaussian into a χ² with one degree of freedom.

        Not knowing the SIGNAL costs an order of magnitude more, and worse, it
        changes the slope: the energy detector's deflection grows as SNR²
        instead of SNR, so it needs N proportional to 1/SNR² samples where a
        matched filter needs 1/SNR.

        Not knowing σ costs a threshold that has to be estimated as it goes —
        CFAR — and that loss is a fixed number of decibels which shrinks as the
        reference window grows.`,

  params: {
    snr: log('SNR', {
      description: 'signal-to-noise ratio per sample',
      min: 1e-3,
      max: 10,
      default: 0.1,
      precision: 4,
    }),
    N: int('N', { description: 'number of samples integrated', min: 1, max: 200, default: 20 }),
    pfa: log('P_FA', {
      description: 'false-alarm probability the threshold is set for',
      min: 1e-4,
      max: 0.5,
      default: 0.01,
      precision: 5,
    }),
    detector: select('method', {
      description: 'what the receiver is assumed to know',
      options: [
        { value: 'matched', label: 'matched filter — signal, amplitude and σ known' },
        { value: 'glrt', label: 'GLRT — amplitude unknown' },
        { value: 'energy', label: 'energy detector — the signal itself unknown' },
        { value: 'cfar', label: 'CFAR — σ unknown too, estimated as it goes' },
      ],
      default: 'glrt',
    }),
    R: int('R', {
      description: 'reference cells per sample, from which σ̂² is estimated',
      min: 1,
      max: 64,
      default: 16,
      visibleIf: { detector: 'cfar' },
    }),
    M: int('M', {
      description: 'Monte Carlo realizations, on the N samples themselves',
      min: 200,
      max: 20000,
      step: 200,
      default: 4000,
    }),
    // seed injected by the core, because random: true
  },

  derived: {
    // The two numbers the room should be able to state before any curve is
    // read: what the matched filter would get, and what the CA-CFAR threshold
    // multiplier tends to.
    deflect: { label: 'deflection √(N·SNR)', calc: (p) => Math.sqrt(p.N * p.snr).toFixed(2) },
    alpha: {
      label: 'CFAR multiplier R(P_FA^(−1/R) − 1) → −ln P_FA',
      calc: (p) =>
        p.detector === 'cfar'
          ? `${(p.R * (p.pfa ** (-1 / p.R) - 1)).toFixed(2)} → ${(-Math.log(p.pfa)).toFixed(2)}`
          : '—',
    },
  },

  groups: [
    { title: 'Signal', params: ['snr', 'N'] },
    { title: 'Test', params: ['pfa', 'detector', 'R'] },
    { title: 'Simulation', params: ['M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // The subject's own grammar, and deliberately the same three tabs in the
    // same order as neyman-pearson: a room that has read that experiment finds
    // this one already laid out.
    view(
      'densities',
      'Distributions of T',
      line('pdfH0', {
        color: '#0072BD',
        width: 2.2,
        label: 'p(T | H₀)',
        overlays: [
          line('pdfH1', { color: '#D95319', width: 2.2, label: 'p(T | H₁)' }),
          band('pfaZone', { color: '#0072BD', opacity: 0.28, label: 'P_FA' }),
          band('pdZone', { color: '#D95319', opacity: 0.28, label: 'P_D' }),
          // CFAR only: the threshold is a RANDOM VARIABLE, so it is drawn as
          // the range it actually lands in rather than as a line it never is
          band('thrBand', { color: '#7E2F8E', opacity: 0.14, label: 'where γ̂ lands, 5–95 %' }),
          vline('gammaLine', { color: '#7E2F8E', width: 2, label: 'γ' }),
        ],
        axes: { x: 'T', y: 'density' },
      })
    ),

    view(
      'roc',
      'ROC',
      line('rocSel', {
        color: '#0072BD',
        width: 2.4,
        label: 'the selected detector',
        overlays: [
          line('rocMatched', { color: '#D95319', width: 2, dashed: true, label: 'matched filter — the ceiling' }),
          line('chanceLine', { color: '#a1a1aa', width: 1.2, dashed: true, label: 'chance' }),
          scatter('opTheory', { color: '#EDB120', size: 7, label: 'operating point' }),
          scatter('opEmp', { color: '#77AC30', size: 6, label: 'Monte Carlo' }),
        ],
        axes: {
          x: { label: 'P_FA', scale: 'log', domain: [1e-4, 1] },
          y: { label: 'P_D', scale: 'log', domain: [1e-4, 1] },
        },
      })
    ),

    // THE figure. Four curves at one P_FA, and what the room must read off it
    // is not the ordering — which is unsurprising — but the SLOPE: the energy
    // detector's curve is not the matched filter's shifted, it is a different
    // shape, and no amount of SNR closes a gap that grows.
    view(
      'pd-vs-snr',
      'P_D vs SNR',
      line('pdMatched', {
        color: '#0072BD',
        width: 2.4,
        label: 'matched filter',
        overlays: [
          line('pdGlrt', { color: '#D95319', width: 2.2, label: 'GLRT — A unknown' }),
          line('pdEnergy', { color: '#77AC30', width: 2.2, label: 'energy — signal unknown' }),
          line('pdCfar', { color: '#7E2F8E', width: 2, dashed: true, label: 'CFAR — σ unknown too' }),
          vline('snrLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'current SNR' }),
          scatter('opSnrEmp', { color: '#EDB120', size: 7, label: 'Monte Carlo' }),
        ],
        axes: { x: { label: 'SNR', unit: 'dB' }, y: { label: 'P_D', domain: [0, 1] } },
      })
    ),
  ],
};
