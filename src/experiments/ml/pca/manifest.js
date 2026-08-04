import { int, bool, select } from '../../../core/fields.js';
import { view, plane, line, bars, stem, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'pca',
  order: 1,
  // aucun tirage : les données sont celles de Fisher, le calcul est exact.
  // Donc pas de graine, pas de dé, pas de `?seed=` dans l'URL.
  title: 'Principal component analysis',
  subtitle: 'Irises and penguins: four measurements, two directions, and the theorem behind them',
  tags: ['PCA', 'iris', 'penguins', 'covariance', 'eigenvalues', 'dimension reduction'],

  params: {
    dataset: select('jeu', {
      description: 'dataset analysed',
      options: [
        { value: 'iris', label: 'Fisher iris (150 flowers, cm)' },
        { value: 'penguins', label: 'Palmer penguins (342, mm and g)' },
      ],
      default: 'iris',
    }),
    standardize: bool('standardiser', {
      description: 'diagonalize the correlation rather than the covariance',
      default: false,
    }),
    k: int('k', {
      description: 'components kept for the reconstruction',
      min: 1,
      max: 4,
      default: 2,
    }),
    xComp: select('abscisse', {
      description: 'component on the horizontal axis',
      options: [
        { value: 1, label: 'CP1' },
        { value: 2, label: 'CP2' },
        { value: 3, label: 'CP3' },
        { value: 4, label: 'CP4' },
      ],
      default: 1,
    }),
    yComp: select('ordonnée', {
      description: 'component on the vertical axis',
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
    { title: 'Data', params: ['dataset'] },
    { title: 'Analysis', params: ['standardize'] },
    { title: 'Projection', params: ['xComp', 'yComp'] },
    { title: 'Reconstruction', params: ['k'] },
  ],

  views: [
    // LE nuage projeté : la meilleure photo plane d'un objet à quatre
    // dimensions. Plan équi-aspect, parce qu'une ACP produit des DISTANCES
    // et qu'un axe étiré les rendrait fausses.
    plane('scores', 'The projected cloud', {
      // Les noms d'espèces sont dans la statline plutôt que dans la légende :
      // ils changent avec le jeu, et une légende ne peut pas dépendre d'un
      // paramètre sans mentir la moitié du temps.
      clouds: [
        { source: 'classA', color: '#0072BD', r: 5, label: 'species 1' },
        { source: 'classB', color: '#D95319', r: 5, label: 'species 2' },
        { source: 'classC', color: '#77AC30', r: 5, label: 'species 3' },
      ],
      axisLines: true,
      symmetric: false,
      axes: { x: 'composante en abscisse', y: 'composante en ordonnée' },
    }),

    // L'éboulis : combien de composantes garder. La courbe cumulée répond à
    // la seule question qu'on se pose vraiment.
    view(
      'scree',
      'Scree plot',
      bars('scree', {
        color: '#0072BD',
        label: 'variance of the component',
        overlays: [
          line('screeCum', { color: '#D95319', width: 2.2, label: 'cumulative' }),
          vline('kLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'k kept' }),
        ],
        axes: { x: { label: 'component' }, y: { label: 'explained variance', unit: '%' } },
      })
    ),

    // Les saturations : ce que chaque composante MESURE. Sans cette vue, une
    // composante principale reste un axe sans nom.
    view(
      'loadings',
      'Variable loadings',
      stem('loadX', {
        color: '#0072BD',
        size: 6,
        label: 'on the x component',
        overlays: [stem('loadY', { color: '#D95319', size: 4.5, label: 'on the y component' })],
        legend: 'left',
        axes: {
          x: { label: 'variable (0 = sepal length … 3 = petal width)' },
          y: { label: 'eigenvector coefficient' },
        },
      })
    ),

    // Et la preuve : l'erreur de reconstruction mesurée tombe exactement sur
    // la somme des valeurs propres jetées. Deux courbes qui se superposent,
    // et c'est un théorème qu'on regarde.
    view(
      'reconstruction',
      'Reconstruction error',
      line('errMeas', {
        color: '#0072BD',
        width: 2.4,
        label: 'measured',
        overlays: [
          line('errTheo', { color: '#D95319', width: 1.6, dashed: true, label: 'Σ discarded eigenvalues' }),
          vline('kLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'k' }),
        ],
        axes: { x: { label: 'components kept k' }, y: { label: 'mean squared error' } },
      })
    ),
  ],
};
