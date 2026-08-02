import { log, int } from '../../../core/fields.js';
import { view, line, scatter, band, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'kalman-filter',
  title: 'Le filtre de Kalman',
  subtitle: 'Estimation récursive : prédire, corriger, et savoir de combien on se trompe',
  tags: ['Kalman', 'estimation récursive', 'Riccati'],
  group: 'Régression et filtrage',

  params: {
    sigw: log('σw', {
      description: 'écart-type du bruit de modèle (dérive)',
      min: 0.001,
      max: 1,
      default: 0.1,
      precision: 3,
    }),
    sigv: log('σv', {
      description: 'écart-type du bruit de mesure',
      min: 0.01,
      max: 10,
      default: 1,
      precision: 2,
    }),
    N: int('N', { description: 'nombre de pas', min: 20, max: 500, default: 120 }),
  },

  views: [
    view(
      'tracking',
      'Suivi',
      line('trueState', {
        label: 'état vrai',
        overlays: [
          band('tube', { color: '#D95319', opacity: 0.15, label: '±3σ' }),
          scatter('meas', { color: '#7E2F8E', size: 2, opacity: 0.5, label: 'mesures' }),
          line('est', { color: '#D95319', width: 2, label: 'estimée' }),
        ],
        axes: { x: 'k', y: 'x' },
      })
    ),
    view(
      'gain',
      'Gain de Kalman',
      line('gains', {
        overlays: [hline('kInf', { color: '#EDB120', dashed: true, label: 'K∞' })],
        axes: { x: 'k', y: 'Kₖ' },
      })
    ),
    view(
      'consistency',
      'Cohérence ±3σ',
      scatter('err', {
        size: 2,
        overlays: [
          band('errTube', { color: '#D95319', opacity: 0.15, label: '±3σ prédit' }),
          hline(() => 0, { color: '#EDB120', dashed: true }),
        ],
        axes: { x: 'k', y: 'erreur x̂ − x' },
      })
    ),
  ],
};
