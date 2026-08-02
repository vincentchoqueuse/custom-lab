import { int, log } from '../../../core/fields.js';
import { view, line, band, scatter, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'neyman-pearson',
  order: 1,
  title: 'Détecteur de Neyman-Pearson',
  subtitle: 'Signal connu dans un bruit gaussien : seuil, ROC et P_D vs SNR',
  tags: ['détection', 'Neyman-Pearson', 'ROC', 'fausse alarme', 'SNR'],

  params: {
    // log sliders — MANDATORY for parameters spanning several orders of
    // magnitude (this experiment exists to stress-test exactly that)
    snr: log('SNR', {
      description: 'rapport signal à bruit (linéaire)',
      min: 0.05,
      max: 50,
      default: 1,
    }),
    pfa: log('P_FA', {
      description: 'probabilité de fausse alarme visée',
      min: 1e-4,
      max: 0.5,
      default: 0.05,
    }),
    N: int('N', { description: "taille de l'échantillon intégré", min: 1, max: 100, default: 10 }),
    M: int('M', {
      description: 'tirages Monte Carlo par hypothèse',
      min: 500,
      max: 20000,
      step: 500,
      default: 5000,
    }),
    // no seed here: injected by the core
  },

  derived: {
    snrDb: { label: 'SNR (dB)', calc: (q) => (10 * Math.log10(q.snr)).toFixed(1) },
    deflection: { label: 'd = √(N·SNR)', calc: (q) => Math.sqrt(q.N * q.snr).toFixed(2) },
  },

  groups: [
    { title: 'Signal', params: ['snr', 'N'] },
    { title: 'Test', params: ['pfa'] },
    { title: 'Monte Carlo', params: ['M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // The two densities of the test statistic, the NP threshold and the two
    // decision areas — the whole story of the trade-off in one picture.
    view(
      'densities',
      'Densités & seuil',
      line('pdfH0', {
        width: 2.5,
        label: 'p(T | H₀)',
        overlays: [
          line('pdfH1', { color: '#D95319', width: 2.5, label: 'p(T | H₁)' }),
          band('pfaZone', { color: '#0072BD', opacity: 0.3, label: 'P_FA' }),
          band('pdZone', { color: '#D95319', opacity: 0.18, label: 'P_D' }),
          vline('gamma', { color: '#7E2F8E', width: 2, label: 'γ' }),
        ],
        axes: { x: 'T', y: 'densité' },
      })
    ),

    // Log-log ROC (radar convention): the low-P_FA regime is where detection
    // actually lives, and the chance line P_D = P_FA stays the diagonal.
    view(
      'roc',
      'Courbe ROC',
      line('rocCurve', {
        width: 2.5,
        label: 'ROC (théorie)',
        overlays: [
          line('chanceLine', { color: '#a1a1aa', width: 1.4, dashed: true, label: 'hasard' }),
          scatter('opTheory', { color: '#EDB120', size: 5.5, label: 'point de fonctionnement' }),
          scatter('opEmp', { color: '#7E2F8E', size: 4.5, label: 'Monte Carlo' }),
        ],
        axes: {
          x: { label: 'P_FA', scale: 'log', domain: [1e-4, 1] },
          y: { label: 'P_D', scale: 'log', domain: [1e-4, 1] },
        },
      })
    ),

    view(
      'pd-vs-snr',
      'P_D vs SNR',
      line('pdVsSnr', {
        width: 2.5,
        label: 'P_D (théorie)',
        overlays: [
          hline((q) => q.pfa, { color: '#a1a1aa', width: 1.2, dashed: true, label: 'P_FA' }),
          vline((q) => 10 * Math.log10(q.snr), { color: '#EDB120', dashed: true, label: 'SNR' }),
          scatter('opSnrEmp', { color: '#7E2F8E', size: 5, label: 'Monte Carlo' }),
        ],
        axes: { x: { label: 'SNR', unit: 'dB' }, y: { label: 'P_D', domain: [0, 1.02] } },
      })
    ),
  ],
};
