import { float, select } from '../../../core/fields.js';
import { view, line, stem, scatter, vline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'sampling-aliasing',
  order: 1,
  title: 'Échantillonnage & repliement',
  subtitle: 'Shannon en direct : sous fe/2 tout va bien, au-dessus les fréquences se replient',
  tags: ['analogique', 'numérique', 'échantillonnage', 'repliement', 'aliasing', 'Shannon', 'Nyquist'],

  params: {
    source: select('source', {
      description: 'signal continu échantillonné',
      options: [
        { value: 'sine', label: 'sinusoïde' },
        { value: 'square', label: 'carré (riche en harmoniques)' },
      ],
      default: 'sine',
    }),
    f: float('f', { description: 'fréquence du signal', min: 0.5, max: 45, step: 0.5, default: 5, unit: 'Hz' }),
    fe: float('fe', { description: 'fréquence d\'échantillonnage', min: 5, max: 100, step: 1, default: 50, unit: 'Hz' }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    nyquist: { label: 'fe/2 (Nyquist)', calc: (p) => `${(p.fe / 2).toFixed(1)} Hz` },
    zone: { label: 'condition de Shannon', calc: (p) => (p.f < p.fe / 2 ? 'respectée' : 'VIOLÉE') },
  },

  groups: [
    { title: 'Signal', params: ['source', 'f'] },
    { title: 'Échantillonnage', params: ['fe'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // continuous truth, its samples, and what the samples let us rebuild
    figure(
      'time',
      line('continuous', {
        width: 2,
        label: 'signal continu',
        overlays: [
          line('reconstructed', { color: '#D95319', width: 2.4, label: 'reconstruit (sinc)' }),
          stem('sampled', { color: '#7E2F8E', size: 3.4, label: 'échantillons' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),

    // true line spectrum vs its folded image in the first Nyquist zone
    figure(
      'spectrum',
      stem('specTrue', {
        color: '#0072BD',
        opacity: 0.8,
        label: 'raies vraies',
        overlays: [
          stem('specAlias', { color: '#D95319', opacity: 0.8, label: 'après repliement' }),
          vline((p) => p.fe / 2, { color: '#EDB120', dashed: true, width: 2, label: 'fe/2' }),
        ],
        axes: { x: { label: 'f', unit: 'Hz' }, y: 'amplitude' },
      })
    ),

    // the folding diagram: apparent frequency vs true frequency at this fe
    view(
      'folding',
      'Fréquence apparente',
      line('foldCurve', {
        color: '#7E2F8E',
        width: 2.4,
        label: 'f apparente',
        overlays: [
          line('diagonal', { color: '#a1a1aa', width: 1.3, dashed: true, label: 'sans repliement' }),
          scatter('currentPoint', { color: '#EDB120', size: 6.5, label: 'point courant' }),
          vline((p) => p.fe / 2, { color: '#EDB120', dashed: true, width: 1.6, label: 'fe/2' }),
        ],
        axes: { x: { label: 'f vraie', unit: 'Hz' }, y: { label: 'f apparente', unit: 'Hz' } },
      })
    ),
  ],
};
