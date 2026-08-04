import { float, int, select, log } from '../../../core/fields.js';
import { view, plane, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'xor',
  order: 3,
  random: true, // l'initialisation est tirée — et elle décide de tout
  title: 'Le XOR',
  subtitle: 'Le contre-exemple de 1969, et les deux neurones qui le règlent',
  tags: ['réseaux', 'XOR', 'perceptron', 'séparabilité', 'couche cachée', 'gradient'],

  params: {
    problem: select('table', {
      description: 'fonction à apprendre',
      options: [
        { value: 'xor', label: 'XOR — non séparable' },
        { value: 'or', label: 'OU — séparable' },
        { value: 'and', label: 'ET — séparable' },
      ],
      default: 'xor',
    }),
    hidden: int('H', {
      description: 'neurones cachés — 1 revient à un perceptron',
      min: 1,
      max: 8,
      default: 2,
    }),
    act: select('σ', {
      description: 'activation de la couche cachée',
      options: [
        { value: 'tanh', label: 'tanh' },
        { value: 'relu', label: 'ReLU' },
        { value: 'sigmoid', label: 'sigmoïde' },
        { value: 'identity', label: 'identité — donc linéaire' },
      ],
      default: 'tanh',
    }),
    lr: log('η', {
      description: 'pas de la descente de gradient',
      min: 0.01,
      max: 5,
      default: 0.5,
      precision: 3,
    }),
    epoch: int('n', {
      description: 'époque observée — le potard qui remplace une animation',
      min: 0,
      max: 4000,
      step: 10,
      default: 4000,
    }),
  },

  groups: [
    { title: 'Problème', params: ['problem'] },
    { title: 'Réseau', params: ['hidden', 'act'] },
    { title: 'Apprentissage', params: ['lr', 'epoch'] },
  ],

  views: [
    // LE plan, et c'est l'expérience elle-même : quatre points, et la
    // frontière que le réseau trace entre eux. Équi-aspect, parce qu'un
    // carré unité déformé en rectangle rendrait les droites cachées
    // mensongères sur leurs pentes.
    plane('plane', 'Le plan (x₁, x₂)', {
      curves: [
        { source: 'boundary', color: '#0072BD', width: 2.4, label: 'frontière du réseau' },
        { source: 'hiddenLines', color: '#a1a1aa', width: 1.4, dashed: true, label: 'neurones cachés' },
      ],
      clouds: [
        // Les RÉGIONS d'abord (donc dessous) : la grille classée par
        // sign(y − ½), en aplat léger. C'est la figure standard, celle que
        // tout le monde a déjà vue, et elle répond à la question que la
        // frontière seule laisse ouverte : de quel côté est quoi.
        { source: 'region0', color: '#D95319', r: 3.5, opacity: 0.16, max: 4000, label: 'décision 0' },
        { source: 'region1', color: '#0072BD', r: 3.5, opacity: 0.16, max: 4000, label: 'décision 1' },
        { source: 'class0', color: '#D95319', r: 8, label: 'classe 0' },
        { source: 'class1', color: '#0072BD', r: 8, label: 'classe 1' },
      ],
      symmetric: false,
      axes: { x: 'x₁', y: 'x₂' },
    }),

    // La descente, avec le plancher du modèle linéaire en repère : tant que
    // la courbe s'y colle, le réseau n'a rien appris que la moyenne.
    view(
      'learning',
      'Descente du gradient',
      line('learning', {
        color: '#0072BD',
        width: 1.8,
        label: 'erreur quadratique',
        overlays: [
          hline('lossFloor', {
            color: '#D95319',
            dashed: true,
            width: 1.6,
            label: 'plancher linéaire 1/8',
          }),
          vline('epochLine', { color: '#71717a', dashed: true, width: 1.2, label: 'époque n' }),
        ],
        axes: {
          x: { label: 'époque' },
          y: { label: 'erreur', scale: 'log', domain: [1e-6, 1] },
        },
      })
    ),
  ],
};
