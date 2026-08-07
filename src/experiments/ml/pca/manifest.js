import { int, bool, select } from '../../../core/fields.js';
import { view, plane, line, bars, stem, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'pca',
  order: 1,
  // no draw at all: the data is Fisher's, the computation is exact. Hence no
  // seed, no dice, and no `?seed=` in the URL.
  title: 'Principal component analysis',
  subtitle: 'Irises and penguins: four measurements, two directions, and the theorem behind them',
  tags: ['PCA', 'iris', 'penguins', 'covariance', 'eigenvalues', 'dimension reduction'],

  doc: `A cloud in four dimensions that nobody can draw — 150 irises or 342
penguins, four measurements each — and its best flat photograph in the
least-squares sense. The three species separate almost perfectly, and
nobody gave them to the algorithm: PCA looked for variance, and the
biological structure was in there. The scree plot says what the photograph
keeps: PC1 carries 92.46 % on the irises, two components 97.77 %, and
putting PC3 and PC4 on the axes instead shows the 2.2 % they share as a
round blur.

The trap of units is the scene the experiment exists for. On the penguins
— three lengths in millimetres, one mass in GRAMS — the raw covariance
puts 99.99 % on a first component that measures mass and nothing else:
643 000 g² against 30 mm², a choice of unit, not a biological result.
Standardizing diagonalizes the correlation instead, PC1 falls to 68.84 %
and becomes flipper length, which genuinely separates the species. The
rule: same nature and unit, covariance; heterogeneous variables,
correlation — and when in doubt, both, one click apart.

The reconstruction view watches a theorem. The measured loss from keeping
k components coincides with the sum of the discarded eigenvalues — the
Eckart–Young theorem of 1936, pinned to 1e-12 — so PCA's quality is
computable before reconstructing anything. And it is the same
eigendecomposition of a covariance as in the high-resolution methods:
there the small eigenvalues were noise, here they are what is thrown
away. One algebra, two readings.`,


  params: {
    dataset: select('dataset', {
      description: 'dataset analysed',
      options: [
        { value: 'iris', label: 'Fisher iris' },
        { value: 'penguins', label: 'Palmer penguins' },
      ],
      default: 'iris',
    }),
    standardize: bool('standardize', {
      description: 'diagonalize the correlation rather than the covariance',
      default: false,
    }),
    k: int('k', {
      description: 'components kept for the reconstruction',
      min: 1,
      max: 4,
      default: 2,
    }),
    xComp: select('x', {
      description: 'component on the horizontal axis',
      options: [
        { value: 1, label: 'PC1' },
        { value: 2, label: 'PC2' },
        { value: 3, label: 'PC3' },
        { value: 4, label: 'PC4' },
      ],
      default: 1,
    }),
    yComp: select('y', {
      description: 'component on the vertical axis',
      options: [
        { value: 1, label: 'PC1' },
        { value: 2, label: 'PC2' },
        { value: 3, label: 'PC3' },
        { value: 4, label: 'PC4' },
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
    // THE projected cloud: the best flat photograph of a four-dimensional
    // object. Equal-aspect plane, because a PCA produces DISTANCES and a
    // stretched axis would make them false.
    plane('scores', 'The projected cloud', {
      // The species names are in the statline rather than in the legend: they
      // change with the dataset, and a legend cannot depend on a parameter
      // without lying half the time.
      clouds: [
        { source: 'classA', color: '#0072BD', r: 5, label: 'species 1' },
        { source: 'classB', color: '#D95319', r: 5, label: 'species 2' },
        { source: 'classC', color: '#77AC30', r: 5, label: 'species 3' },
      ],
      axisLines: true,
      symmetric: false,
      axes: { x: 'component on x', y: 'component on y' },
    }),

    // The scree plot: how many components to keep. The cumulative curve answers
    // the only question one really asks.
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

    // The loadings: what each component MEASURES. Without this view a principal
    // component stays a nameless axis.
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

    // And the proof: the measured reconstruction error falls exactly on the sum
    // of the discarded eigenvalues. Two curves that superpose, and what one is
    // looking at is a theorem.
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
