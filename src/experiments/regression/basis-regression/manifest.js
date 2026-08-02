import { float, int, log, select } from '../../../core/fields.js';
import { view, line, scatter, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'basis-regression',
  order: 2,
  title: 'Régression à fonctions de base',
  subtitle: 'Linéaire ne veut pas dire droite — mêmes moindres carrés, nouvelles formes',
  tags: ['fonctions de base', 'moindres carrés', 'RBF', 'noyau', 'train/test', 'sur-ajustement'],

  params: {
    basis: select('base', {
      description: 'famille de fonctions φⱼ',
      options: [
        { value: 'rbf', label: 'gaussiennes (RBF)' },
        { value: 'poly', label: 'polynômes' },
        { value: 'fourier', label: 'Fourier' },
        { value: 'sigmoid', label: 'sigmoïdes (pré-neurones)' },
      ],
      default: 'rbf',
    }),
    target: select('cible', {
      description: 'fonction vraie à retrouver',
      options: [
        { value: 'damped', label: 'sinusoïde amortie' },
        { value: 'square', label: 'créneau' },
        { value: 'bump', label: 'bosse gaussienne' },
      ],
      default: 'damped',
    }),
    M: int('M', { description: 'nombre de fonctions de base', min: 1, max: 30, default: 8 }),
    ell: log('ℓ', {
      description: 'largeur des gaussiennes / raideur des sigmoïdes',
      min: 0.02,
      max: 1,
      default: 0.15,
      visibleIf: { basis: ['rbf', 'sigmoid'] },
    }),
    lambda: log('λ', {
      description: 'régularisation ridge (stabilise les RBF serrées)',
      min: 1e-10,
      max: 1,
      default: 1e-8,
    }),
    N: int('N', { description: 'points d\'apprentissage', min: 10, max: 300, default: 60 }),
    sigma: float('σ', { description: 'écart-type du bruit', min: 0, max: 0.5, step: 0.02, default: 0.1 }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (p) => p.M > p.N, message: 'Il faut N ≥ M points pour M fonctions de base' },
  ],

  groups: [
    { title: 'Modèle', params: ['basis', 'M', 'ell', 'lambda'] },
    { title: 'Données', params: ['target', 'N', 'sigma'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults]

  views: [
    view(
      'fit',
      'Ajustement',
      line('trueCurve', {
        width: 2.2,
        label: 'vraie fonction',
        overlays: [
          scatter('trainPoints', { color: '#7E2F8E', size: 3.5, opacity: 0.55, label: 'données' }),
          line('fitCurve', { color: '#D95319', width: 2.5, label: 'ajustement' }),
        ],
        axes: { x: 'x', y: 'y' },
      })
    ),

    // the signature view: the fit IS a sum of weighted basis functions
    view(
      'basis',
      'Fonctions de base',
      line('basisCurves', {
        color: '#77AC30',
        width: 1.1,
        opacity: 0.55,
        label: 'wⱼ·φⱼ(x)',
        overlays: [
          line('fitCurve', { color: '#D95319', width: 2.5, label: 'somme (ajustement)' }),
          line('trueCurve', { width: 1.6, dashed: true, label: 'vraie fonction' }),
        ],
        axes: { x: 'x', y: 'y' },
      })
    ),

    // train falls forever, test is U-shaped with a σ² floor
    view(
      'complexity',
      'Erreur vs M',
      line('errTrain', {
        width: 2.2,
        label: 'apprentissage',
        overlays: [
          line('errTest', { color: '#D95319', width: 2.4, label: 'test (données fraîches)' }),
          hline((p) => Math.max(p.sigma ** 2, 1e-12), {
            color: '#a1a1aa',
            width: 1.2,
            dashed: true,
            label: 'σ² (plancher)',
          }),
          vline((p) => p.M, { color: '#EDB120', dashed: true, width: 1.8, label: 'M' }),
        ],
        axes: { x: 'M (nombre de fonctions)', y: { label: 'EQM', scale: 'log' } },
      })
    ),
  ],
};
