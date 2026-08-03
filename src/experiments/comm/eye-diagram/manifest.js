import { float, int, log, select } from '../../../core/fields.js';
import { view, line, histogram, scatter, vline, hline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'eye-diagram',
  order: 3,
  random: true,
  title: 'Diagramme de l\'œil',
  subtitle: 'ISI, bruit et instant d\'échantillonnage — la santé d\'une liaison en un regard',
  tags: ['diagramme de l\'œil', 'ISI', 'cosinus surélevé', 'Nyquist', 'PAM'],

  params: {
    levels: select('M', {
      description: 'nombre de niveaux PAM',
      options: [
        { value: 2, label: '2-PAM (±1)' },
        { value: 4, label: '4-PAM (deux bits/symbole)' },
      ],
      default: 2,
    }),
    alpha: float('α', {
      description: 'roll-off du cosinus surélevé',
      min: 0.05,
      max: 1,
      step: 0.05,
      default: 0.35,
      precision: 2,
    }),
    bt: log('B·T', {
      description: 'bande passante du canal (normalisée au débit symbole)',
      min: 0.2,
      max: 8,
      default: 8,
    }),
    sigma: float('σ', { description: 'bruit au récepteur', min: 0, max: 0.4, step: 0.01, default: 0.02 }),
    Nsym: int('N', {
      description: 'nombre de symboles superposés',
      min: 50,
      max: 1000,
      step: 50,
      default: 200,
    }),
    // no seed here: injected by the core
  },

  groups: [
    { title: 'Émission', params: ['levels', 'alpha'] },
    { title: 'Canal', params: ['bt', 'sigma'] },
    { title: 'Observation', params: ['Nsym'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // all 2T slices overlaid — one NaN-broken series drawn by the generic
    // Line; the ±1/3 level guides only exist in 4-PAM (NaN hides them)
    view(
      'eye',
      'Diagramme de l\'œil',
      line('eyeTraces', {
        width: 1.1,
        opacity: 0.28,
        overlays: [
          vline(() => 1, { color: '#EDB120', dashed: true, width: 2, label: 'instant optimal' }),
          hline(() => 1, { color: '#a1a1aa', width: 1, dashed: true }),
          hline(() => -1, { color: '#a1a1aa', width: 1, dashed: true }),
          hline((p) => (p.levels === 4 ? 1 / 3 : NaN), { color: '#a1a1aa', width: 1, dashed: true }),
          hline((p) => (p.levels === 4 ? -1 / 3 : NaN), { color: '#a1a1aa', width: 1, dashed: true }),
        ],
        axes: { x: 't/T', y: 'x(t)' },
      })
    ),

    // where the slices come from: the waveform and its decision samples
    figure(
      'time',
      line('waveform', {
        width: 1.8,
        label: 'signal reçu',
        overlays: [
          scatter('samplePoints', { color: '#D95319', size: 4.5, label: 'échantillons à kT' }),
        ],
        axes: { x: 't/T', y: 'x(t)' },
      })
    ),

    // the vertical cut at the sampling instant: clusters around the levels
    view(
      'at-sample',
      'À l\'instant d\'échantillonnage',
      histogram('sampleValues', {
        color: '#0072BD',
        opacity: 0.6,
        overlays: [
          vline(() => 1, { color: '#EDB120', dashed: true, width: 1.6 }),
          vline(() => -1, { color: '#EDB120', dashed: true, width: 1.6 }),
          vline((p) => (p.levels === 4 ? 1 / 3 : NaN), { color: '#EDB120', dashed: true, width: 1.6 }),
          vline((p) => (p.levels === 4 ? -1 / 3 : NaN), { color: '#EDB120', dashed: true, width: 1.6 }),
        ],
        axes: { x: 'valeur échantillonnée', y: 'densité' },
      })
    ),
  ],
};
