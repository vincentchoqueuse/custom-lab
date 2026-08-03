import { float, int } from '../../../core/fields.js';
import { view, line, scatter, histogram, density, hline, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'linear-regression',
  order: 1,
  title: 'Régression linéaire',
  subtitle: 'Ajuster y = a·x + b au sens des moindres carrés — et ce que vaut la pente',
  tags: ['moindres carrés', 'droite', 'résidus', 'R²', 'levier'],

  params: {
    a: float('a', { description: 'pente vraie', min: -3, max: 3, step: 0.1, default: 1.5 }),
    b: float('b', { description: 'ordonnée à l\'origine vraie', min: -5, max: 5, step: 0.2, default: 1 }),
    sigma: float('σ', {
      description: 'écart-type du bruit',
      min: 0,
      max: 4,
      step: 0.1,
      default: 1,
      precision: 1,
    }),
    N: int('N', { description: 'nombre de points observés', min: 3, max: 200, default: 20 }),
    spread: float('L', {
      description: 'demi-étendue des abscisses (les x vont de −L à +L)',
      min: 0.5,
      max: 6,
      step: 0.1,
      default: 3,
      precision: 1,
    }),
    outlier: float('point aberrant', {
      description: 'décalage appliqué au DERNIER point seulement',
      min: -15,
      max: 15,
      step: 0.5,
      default: 0,
      precision: 1,
    }),
    // no seed here: injected by the core
  },

  groups: [
    { title: 'Droite vraie', params: ['a', 'b'] },
    { title: 'Observations', params: ['N', 'sigma', 'spread', 'outlier'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    // The data first, with the quantity actually minimised drawn on it: the
    // vertical residual segments. One NaN-separated series does the whole
    // bundle, so no custom view is needed.
    view(
      'fit',
      'Nuage et droite',
      scatter('points', {
        color: '#7E2F8E',
        size: 3.8,
        opacity: 0.85,
        label: 'observations',
        overlays: [
          line('residualSegments', {
            color: '#a1a1aa',
            width: 1.2,
            label: 'résidus (ce qui est minimisé)',
          }),
          line('truth', { color: '#EDB120', width: 1.6, dashed: true, label: 'droite vraie' }),
          line('fitted', { color: '#0072BD', width: 2.6, label: 'droite ajustée' }),
        ],
        axes: { x: 'x', y: 'y' },
      })
    ),

    // The diagnostic: with the right model the residuals are a shapeless
    // cloud around zero — any pattern here means the straight line was wrong.
    view(
      'residuals',
      'Résidus',
      scatter('residuals', {
        color: '#D95319',
        size: 3.8,
        opacity: 0.85,
        label: 'y − ŷ',
        overlays: [hline(() => 0, { color: '#a1a1aa', width: 1.4 })],
        axes: { x: 'x', y: 'y − ŷ' },
      })
    ),

    // What the slope is worth: 400 repeated experiments against σ/√Sxx.
    view(
      'sampling',
      'Loi de la pente â',
      histogram('slopes', {
        color: '#0072BD',
        opacity: 0.6,
        label: '400 expériences répétées',
        overlays: [
          density('slopePdf', { color: '#EDB120', width: 2.4, label: 'N(a, σ²/Sxx) — théorie' }),
          vline((p) => p.a, { color: '#EDB120', dashed: true, width: 1.6, label: 'a' }),
        ],
        axes: { x: 'â', y: 'densité' },
      })
    ),
  ],
};
