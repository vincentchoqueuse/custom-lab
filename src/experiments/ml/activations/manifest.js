import { float, select } from '../../../core/fields.js';
import { view, figure, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'activations',
  order: 1,
  random: true, // l'entrée « bruit » tire
  title: 'Activation functions',
  subtitle: 'A memoryless nonlinearity: what it does to a curve, and to a spectrum',
  tags: ['networks', 'activation', 'ReLU', 'tanh', 'nonlinearity', 'harmonics'],

  params: {
    act: select('σ', {
      description: 'activation function',
      options: [
        { value: 'identity', label: 'identity — none' },
        { value: 'relu', label: 'ReLU' },
        { value: 'leaky', label: 'leaky ReLU (0.01)' },
        { value: 'tanh', label: 'tanh' },
        { value: 'sigmoid', label: 'sigmoid' },
        { value: 'gelu', label: 'GELU' },
      ],
      default: 'relu',
    }),
    signal: select('entrée', {
      description: 'signal fed to the activation',
      options: [
        { value: 'sine', label: 'sinusoid (16 Hz)' },
        { value: 'two', label: 'two tones (16 + 21 Hz)' },
        { value: 'square', label: 'square wave' },
        { value: 'noise', label: 'white noise' },
      ],
      default: 'sine',
    }),
    gain: float('g', {
      description: 'gain before the activation — this is what drives it into saturation',
      min: 0.1,
      max: 8,
      step: 0.1,
      default: 1,
      precision: 1,
    }),
    bias: float('b', {
      description: 'bias before the activation',
      min: -3,
      max: 3,
      step: 0.1,
      default: 0,
      precision: 1,
    }),
  },

  groups: [
    { title: 'Activation', params: ['act'] },
    { title: 'Input', params: ['signal', 'gain', 'bias'] },
  ],

  views: [
    // La courbe D'ABORD, parce que c'est l'objet lui-même — et sa dérivée
    // avec elle : une activation se choisit autant pour ce qu'elle laisse
    // passer du gradient que pour sa forme.
    view(
      'transfer',
      'σ(x) et sa dérivée',
      line('transfer', {
        color: '#0072BD',
        width: 2.4,
        label: 'σ(x)',
        overlays: [
          line('derivative', { color: '#D95319', width: 2, label: 'σ′(x)' }),
          line('identity', { color: '#a1a1aa', width: 1.2, dashed: true, label: 'identity' }),
          vline((p) => p.bias, { color: '#EDB120', dashed: true, width: 1.4, label: 'bias' }),
          hline(() => 0, { color: '#e4e4e7', width: 1 }),
        ],
        legend: 'left',
        axes: { x: { label: 'x' }, y: { label: 'σ(x), σ′(x)' } },
      })
    ),

    // LES DÉRIVÉES, toutes ensemble — la figure de manuel, et la seule qui
    // réponde à « laquelle choisir ». On y lit d'un regard les trois faits
    // qui décident : ReLU rend 1 ou 0 sans nuance, tanh part de 1 et
    // s'effondre, la sigmoïde plafonne à 1/4. Cliquer une pastille éteint
    // sa courbe, pour les comparer deux à deux.
    view(
      'derivatives',
      'Derivatives compared',
      line('dRelu', {
        color: '#0072BD',
        width: 2,
        label: 'ReLU′',
        overlays: [
          line('dLeaky', { color: '#77AC30', width: 1.6, dashed: true, label: 'leaky ReLU′' }),
          line('dTanh', { color: '#D95319', width: 2, label: 'tanh′' }),
          line('dSigmoid', { color: '#7E2F8E', width: 2, label: 'sigmoid′' }),
          line('dGelu', { color: '#EDB120', width: 2, label: 'GELU′' }),
        ],
        legend: 'left',
        // le cadre descend à −0.2 pour montrer que GELU′ passe SOUS zéro
        // (minimum −0.13) : elle n'est pas monotone, contrairement aux
        // quatre autres, et c'est une propriété qu'il ne faut pas rogner
        axes: { x: { label: 'x' }, y: { label: 'σ′(x)', domain: [-0.2, 1.2] } },
      })
    ),

    // Le temporel : écrêter, redresser, ou ne rien faire.
    figure(
      'time',
      line('xTime', {
        color: '#7E2F8E',
        width: 1.6,
        label: 'input g·x + b',
        overlays: [line('yTime', { color: '#0072BD', width: 2, label: 'σ(g·x + b)' })],
        axes: { x: { label: 't', unit: 'ms' }, y: { label: 'amplitude' } },
      })
    ),

    // Et le spectre, qui est le propos : une non-linéarité CRÉE des
    // fréquences. Les deux spectres sont normalisés à leur propre maximum,
    // donc ce qui se compare est la RICHESSE, pas le niveau.
    figure(
      'spectrum',
      line('specOut', {
        color: '#0072BD',
        width: 1.6,
        label: 'after σ',
        overlays: [
          line('specIn', { color: '#7E2F8E', width: 1.4, opacity: 0.55, label: 'before' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz', domain: [0, 200] },
          y: { label: 'amplitude', unit: 'dB', domain: [-90, 3] },
        },
      })
    ),
  ],
};
