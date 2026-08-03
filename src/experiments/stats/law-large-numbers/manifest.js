import { float, int, select } from '../../../core/fields.js';
import { view, line, band, hline } from '../../../core/views.js';
import { canonicalLaws } from '../_lib/laws.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'law-large-numbers',
  order: 4,
  random: true,
  title: 'Loi des grands nombres',
  subtitle: 'Chaque trajectoire de x̄ₙ converge vers μ — à la vitesse 1/√n',
  tags: ['LGN', 'convergence', 'moyenne empirique', 'trajectoires'],

  params: {
    law: select('loi', {
      description: 'loi des tirages individuels',
      options: [
        { value: 'dice', label: 'Dé à 6 faces' },
        { value: 'uniform', label: 'Uniforme U(0, 1)' },
        { value: 'exponential', label: 'Exponentielle Exp(1)' },
        { value: 'bernoulli', label: 'Bernoulli(p)' },
      ],
      default: 'dice',
    }),
    n: int('n', {
      description: 'horizon (taille finale de l\'échantillon)',
      min: 100,
      max: 10000,
      step: 100,
      default: 2000,
    }),
    K: int('K', { description: 'nombre de trajectoires', min: 1, max: 20, default: 5 }),
    p: float('p', {
      description: 'probabilité de succès',
      min: 0.05,
      max: 0.95,
      step: 0.05,
      default: 0.5,
      precision: 2,
      visibleIf: { law: 'bernoulli' },
    }),
    // no seed here: injected by the core
  },

  derived: {
    precision: {
      label: 'σ/√n à l\'horizon',
      calc: (q) => Math.sqrt(canonicalLaws[q.law].variance(q) / q.n).toFixed(4),
    },
  },

  groups: [
    { title: 'Tirages', params: ['law', 'p'] },
    { title: 'Trajectoires', params: ['n', 'K'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // Fully declarative — the funnel band is the main layer (under the
    // trajectories); the K running means are packed in ONE series with
    // NaN separators (the line primitive breaks segments on non-finite
    // values). Log x axis: convergence is a story told over decades.
    view(
      'trajectories',
      'Trajectoires de x̄ₙ',
      band('funnel', {
        color: '#EDB120',
        opacity: 0.22,
        label: 'μ ± 2σ/√n',
        overlays: [
          line('trajectories', { width: 1.6, opacity: 0.85, label: 'x̄ₙ (K trajectoires)' }),
          hline('meanTh', { color: '#D95319', width: 2, label: 'μ' }),
        ],
        axes: { x: { label: 'n', scale: 'log' }, y: 'x̄ₙ' },
      })
    ),
  ],
};
