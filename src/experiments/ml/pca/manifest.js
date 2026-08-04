import { int, bool, select } from '../../../core/fields.js';
import { view, plane, line, bars, stem, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'pca',
  order: 1,
  // aucun tirage : les données sont celles de Fisher, le calcul est exact.
  // Donc pas de graine, pas de dé, pas de `?seed=` dans l'URL.
  title: 'Analyse en composantes principales',
  subtitle: 'Iris et manchots : quatre mesures, deux directions, et le théorème qui le justifie',
  tags: ['ACP', 'PCA', 'iris', 'manchots', 'covariance', 'valeurs propres', 'réduction de dimension'],

  params: {
    dataset: select('jeu', {
      description: 'données analysées',
      options: [
        { value: 'iris', label: 'iris de Fisher (150 fleurs, cm)' },
        { value: 'penguins', label: 'manchots de Palmer (342, mm et g)' },
      ],
      default: 'iris',
    }),
    standardize: bool('standardiser', {
      description: 'diagonaliser la corrélation plutôt que la covariance',
      default: false,
    }),
    k: int('k', {
      description: 'composantes gardées pour la reconstruction',
      min: 1,
      max: 4,
      default: 2,
    }),
    xComp: select('abscisse', {
      description: 'composante en abscisse du nuage',
      options: [
        { value: 1, label: 'CP1' },
        { value: 2, label: 'CP2' },
        { value: 3, label: 'CP3' },
        { value: 4, label: 'CP4' },
      ],
      default: 1,
    }),
    yComp: select('ordonnée', {
      description: 'composante en ordonnée du nuage',
      options: [
        { value: 1, label: 'CP1' },
        { value: 2, label: 'CP2' },
        { value: 3, label: 'CP3' },
        { value: 4, label: 'CP4' },
      ],
      default: 2,
    }),
  },

  groups: [
    { title: 'Données', params: ['dataset'] },
    { title: 'Analyse', params: ['standardize'] },
    { title: 'Projection', params: ['xComp', 'yComp'] },
    { title: 'Reconstruction', params: ['k'] },
  ],

  views: [
    // LE nuage projeté : la meilleure photo plane d'un objet à quatre
    // dimensions. Plan équi-aspect, parce qu'une ACP produit des DISTANCES
    // et qu'un axe étiré les rendrait fausses.
    plane('scores', 'Le nuage projeté', {
      // Les noms d'espèces sont dans la statline plutôt que dans la légende :
      // ils changent avec le jeu, et une légende ne peut pas dépendre d'un
      // paramètre sans mentir la moitié du temps.
      clouds: [
        { source: 'classA', color: '#0072BD', r: 5, label: 'espèce 1' },
        { source: 'classB', color: '#D95319', r: 5, label: 'espèce 2' },
        { source: 'classC', color: '#77AC30', r: 5, label: 'espèce 3' },
      ],
      axisLines: true,
      symmetric: false,
      axes: { x: 'composante en abscisse', y: 'composante en ordonnée' },
    }),

    // L'éboulis : combien de composantes garder. La courbe cumulée répond à
    // la seule question qu'on se pose vraiment.
    view(
      'scree',
      'Éboulis des valeurs propres',
      bars('scree', {
        color: '#0072BD',
        label: 'variance de la composante',
        overlays: [
          line('screeCum', { color: '#D95319', width: 2.2, label: 'cumulée' }),
          vline('kLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'k gardées' }),
        ],
        axes: { x: { label: 'composante' }, y: { label: 'variance expliquée', unit: '%' } },
      })
    ),

    // Les saturations : ce que chaque composante MESURE. Sans cette vue, une
    // composante principale reste un axe sans nom.
    view(
      'loadings',
      'Saturations des variables',
      stem('loadX', {
        color: '#0072BD',
        size: 6,
        label: 'sur l’abscisse',
        overlays: [stem('loadY', { color: '#D95319', size: 4.5, label: 'sur l’ordonnée' })],
        legend: 'left',
        axes: {
          x: { label: 'variable (0 = long. sépale … 3 = larg. pétale)' },
          y: { label: 'coefficient du vecteur propre' },
        },
      })
    ),

    // Et la preuve : l'erreur de reconstruction mesurée tombe exactement sur
    // la somme des valeurs propres jetées. Deux courbes qui se superposent,
    // et c'est un théorème qu'on regarde.
    view(
      'reconstruction',
      'Erreur de reconstruction',
      line('errMeas', {
        color: '#0072BD',
        width: 2.4,
        label: 'mesurée',
        overlays: [
          line('errTheo', { color: '#D95319', width: 1.6, dashed: true, label: 'Σ valeurs propres jetées' }),
          vline('kLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'k' }),
        ],
        axes: { x: { label: 'composantes gardées k' }, y: { label: 'erreur quadratique moyenne' } },
      })
    ),
  ],
};
