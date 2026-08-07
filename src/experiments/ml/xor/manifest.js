import { float, int, select, log } from '../../../core/fields.js';
import { view, plane, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'xor',
  order: 4,
  random: true, // the initialization is drawn — and it decides everything
  title: 'The XOR',
  subtitle: 'The 1969 counter-example, and the two neurons that settle it',
  tags: ['networks', 'XOR', 'perceptron', 'separability', 'hidden layer', 'gradient'],

  doc: `Four points, two classes, and no line separates them: the 1969
counter-example of Minsky and Papert, after which perceptron funding
stopped for fifteen years. The linear neuron's best answer is the constant
1/2 — an optimum, not a failure of the descent, and the harness proves it.
OR and AND, one pill away, are separable; XOR is the one that is not.

Two hidden tanh neurons settle it: each draws a line that separates
nothing alone, and their combination is a band that does — h₁ = OR,
h₂ = AND, output = h₁ − h₂, "or, but not both" in one subtraction. The
learning curve carries its own lesson: hundreds of epochs on a plateau at
the linear model's floor, gradient near zero, before the symmetry breaks
and the error falls by decades. Anyone stopping at epoch 200 concludes it
does not work — the most common mistake in the field.

The last scene measures what the initial randomness decides, over forty
draws: tanh at H = 2 succeeds 34 times, at H = 4 all forty; ReLU at H = 2
succeeds FOUR times. Width offers not more expressiveness but more PATHS —
two neurons are enough, four escape more valleys — and the default
activation of the whole field dies here nine times out of ten, a ReLU
whose input is negative at all four points having zero gradient forever.`,


  params: {
    problem: select('table', {
      description: 'function to learn',
      options: [
        { value: 'xor', label: 'XOR — not separable' },
        { value: 'or', label: 'OR — separable' },
        { value: 'and', label: 'AND — separable' },
      ],
      default: 'xor',
    }),
    hidden: int('H', {
      description: 'hidden neurons — 1 amounts to a perceptron',
      min: 1,
      max: 8,
      default: 2,
    }),
    act: select('activation', {
      description: 'activation of the hidden layer',
      options: [
        { value: 'tanh', label: 'tanh' },
        { value: 'relu', label: 'ReLU' },
        { value: 'sigmoid', label: 'sigmoid' },
        { value: 'identity', label: 'identity' },
      ],
      default: 'tanh',
    }),
    lr: log('η', {
      description: 'gradient-descent step size',
      min: 0.01,
      max: 5,
      default: 0.5,
      precision: 3,
    }),
    epoch: int('n', {
      description: 'epoch observed — the dial that replaces an animation',
      min: 0,
      max: 4000,
      step: 10,
      default: 4000,
    }),
  },

  groups: [
    { title: 'Problem', params: ['problem'] },
    { title: 'Network', params: ['hidden', 'act'] },
    { title: 'Training', params: ['lr', 'epoch'] },
  ],

  views: [
    // THE plane, and it is the experiment itself: four points, and the boundary
    // the network draws between them. Equal aspect, because a unit square
    // stretched into a rectangle would make the hidden lines lie about their
    // slopes.
    plane('plane', 'The (x₁, x₂) plane', {
      curves: [
        { source: 'boundary', color: '#0072BD', width: 2.4, label: 'network boundary' },
        { source: 'hiddenLines', color: '#a1a1aa', width: 1.4, dashed: true, label: 'hidden neurons' },
      ],
      clouds: [
        // The REGIONS first (hence underneath): the grid classified by
        // sign(y − ½), in a light wash. This is the standard figure, the one
        // everyone has already seen, and it answers the question the boundary
        // alone leaves open: which side is which.
        { source: 'region0', color: '#D95319', r: 3.5, opacity: 0.16, max: 4000, label: 'decision 0' },
        { source: 'region1', color: '#0072BD', r: 3.5, opacity: 0.16, max: 4000, label: 'decision 1' },
        { source: 'class0', color: '#D95319', r: 8, label: 'class 0' },
        { source: 'class1', color: '#0072BD', r: 8, label: 'class 1' },
      ],
      symmetric: false,
      axes: { x: 'x₁', y: 'x₂' },
    }),

    // The descent, with the floor of the linear model as a guide: as long as
    // the curve sticks to it, the network has learned nothing but the mean.
    view(
      'learning',
      'Gradient descent',
      line('learning', {
        color: '#0072BD',
        width: 1.8,
        label: 'squared error',
        overlays: [
          hline('lossFloor', {
            color: '#D95319',
            dashed: true,
            width: 1.6,
            label: 'linear floor 1/8',
          }),
          vline('epochLine', { color: '#71717a', dashed: true, width: 1.2, label: 'epoch n' }),
        ],
        axes: {
          x: { label: 'epoch' },
          y: { label: 'error', scale: 'log', domain: [1e-6, 1] },
        },
      })
    ),
  ],
};
