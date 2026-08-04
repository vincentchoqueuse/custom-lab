import { float, int, select, log } from '../../../core/fields.js';
import { view, plane, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'xor',
  order: 5,
  random: true, // the initialization is drawn — and it decides everything
  title: 'The XOR',
  subtitle: 'The 1969 counter-example, and the two neurons that settle it',
  tags: ['networks', 'XOR', 'perceptron', 'separability', 'hidden layer', 'gradient'],

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
    act: select('σ', {
      description: 'activation of the hidden layer',
      options: [
        { value: 'tanh', label: 'tanh' },
        { value: 'relu', label: 'ReLU' },
        { value: 'sigmoid', label: 'sigmoid' },
        { value: 'identity', label: 'identity — hence linear' },
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
