import { float, int, log, select } from '../../../core/fields.js';
import { view, plane, line, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'playground',
  order: 5,
  random: true,
  title: 'The playground',
  subtitle: 'Four datasets, one hidden layer — and the boundary that folds to fit',
  tags: ['neural network', 'playground', 'decision boundary', 'overfitting', 'capacity'],

  doc: `The most famous machine-learning applet on the internet, rebuilt on the
catalogue's terms: four two-dimensional datasets, a 2 → H → 1 network, and
the decision boundary watched folding as the epoch dial walks the training.
The xor experiment proved the 1969 point on four points; here the same
network meets DATA, with a test set the descent never sees and an accuracy
pair in the statline that separates fitting from learning.

The datasets are a ladder of shapes. Two blobs fall to a single neuron — one
line, drawn almost immediately, and landing on the Bayes rate the closed
form Q(‖c₁−c₀‖/2σ) prescribes. The ring around a core defeats every line at
H = 1 — measured, no seed reaches 90 % — and falls to four neurons, at 97 %
on a typical seed: capacity is not a luxury, it is the shape of the
boundary. The
spiral is the famous one, and it is calibrated to keep its reputation: H = 2
never solves it, H = 8 always does — width buys paths through a non-convex
landscape, the lesson the xor experiment measured on its forty draws.

One honest finding from the calibration is written into the compute: with
the timid symmetric initialization that suits xor's four points, the spiral
sits at 50 % accuracy FOREVER — not slow, stuck. The first layer must start
wide enough for the hidden lines to cut the plane in different places before
the descent can tell them apart. Initialization is not a detail; it decides
which minima exist for the descent to find.

The σ pill closes with the catalogue's oldest trade: raise the noise and the
train and test curves separate — the network starts memorizing the
particular points instead of the shape, and the U of the basis-regression
experiment returns, this time drawn by a neural network.`,

  params: {
    dataset: select('dataset', {
      description: 'the two classes to separate',
      options: [
        { value: 'blobs', label: 'two blobs' },
        { value: 'circle', label: 'ring and core' },
        { value: 'xor', label: 'XOR blobs' },
        { value: 'spiral', label: 'two spiral arms' },
      ],
      default: 'circle',
    }),
    hidden: int('H', { description: 'hidden neurons', min: 1, max: 8, default: 4 }),
    act: select('activation', {
      description: 'activation of the hidden layer',
      options: [
        { value: 'tanh', label: 'tanh' },
        { value: 'relu', label: 'ReLU' },
      ],
      default: 'tanh',
    }),
    lr: log('η', { description: 'learning rate of the descent', min: 0.02, max: 0.8, default: 0.4, precision: 2 }),
    epoch: int('n', {
      description: 'epoch on display — the dial that replaces an animation, as in xor',
      min: 0,
      max: 3000,
      step: 25,
      default: 3000,
    }),
    sigma: float('σ', {
      description: 'spread of the clusters around their shape',
      min: 0.05,
      max: 0.8,
      step: 0.05,
      default: 0.2,
      precision: 2,
    }),
    // no seed here: injected by the core
  },

  groups: [
    { title: 'Data', params: ['dataset', 'sigma'] },
    { title: 'Network', params: ['hidden', 'act'] },
    { title: 'Training', params: ['lr', 'epoch'] },
  ],

  views: [
    plane('plane', 'The two classes, and the boundary', {
      clouds: [
        // regions first, hence underneath: the plane classified, in a wash
        { source: 'region0', color: '#D95319', r: 3.5, opacity: 0.14, max: 4000, label: 'decision 0' },
        { source: 'region1', color: '#0072BD', r: 3.5, opacity: 0.14, max: 4000, label: 'decision 1' },
        { source: 'train0', color: '#D95319', r: 4.5, label: 'class 0 — train' },
        { source: 'train1', color: '#0072BD', r: 4.5, label: 'class 1 — train' },
        { source: 'test0', color: '#D95319', r: 2.6, opacity: 0.45, label: 'test' },
        { source: 'test1', color: '#0072BD', r: 2.6, opacity: 0.45 },
      ],
      curves: [{ source: 'boundary', color: '#7E2F8E', width: 2.4, label: 'decision boundary' }],
      symmetric: false,
      axes: { x: 'x₁', y: 'x₂' },
    }),

    view(
      'learning',
      'Train against test',
      line('trainCurve', {
        width: 2.2,
        label: 'train loss',
        overlays: [
          line('testCurve', { color: '#D95319', width: 2.2, label: 'test loss' }),
          vline('epochNow', { color: '#EDB120', dashed: true, label: 'epoch' }),
        ],
        axes: {
          x: 'epoch',
          y: { label: 'mean squared error', scale: 'log', domain: [1e-4, null] },
        },
      })
    ),
  ],
};
