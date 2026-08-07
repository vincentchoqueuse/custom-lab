import { float, int } from '../../../core/fields.js';
import { view, line, scatter, histogram, density, hline, vline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'linear-regression',
  order: 1,
  random: true,
  title: 'Linear regression',
  subtitle: 'Fitting y = a·x + b by least squares — and what the slope is worth',
  tags: ['least squares', 'straight line', 'residuals', 'R²', 'leverage'],

  doc: `The vertical grey segments are the quantity being minimized — the sum of
their squares, not the distance to the line: y is what is being predicted
from x. The fitted line never coincides with the true one, and cannot: the
line is not observed, only twenty noisy points are, and redrawing makes the
estimate dance around the truth.

The residuals are the only honest diagnostic. With the right model they are a
shapeless cloud around zero, and two properties are exact rather than
approximate: they sum to zero, and they are orthogonal to x — the line has
extracted everything x could say about y. When curvature appears in that
view, the straight line has stopped being enough, and polynomial regression
begins.

The slope law carries the design lesson. The distribution of â has standard
deviation σ/√Sxx, so doubling the RANGE of x halves it while doubling the
number of points only divides it by √2: where the points are placed matters
more than how many there are. And the last scene opens the next chapter — one
point dragged away bends the whole line, because squaring the errors gives
the largest one a crushing weight. Least squares has no defence against a
wrong value, which is the door into robust methods.`,


  params: {
    a: float('a', { description: 'true slope', min: -3, max: 3, step: 0.1, default: 1.5 }),
    b: float('b', { description: 'true intercept', min: -5, max: 5, step: 0.2, default: 1 }),
    sigma: float('σ', {
      description: 'noise standard deviation',
      min: 0,
      max: 4,
      step: 0.1,
      default: 1,
      precision: 1,
    }),
    N: int('N', { description: 'number of observed points', min: 3, max: 200, default: 20 }),
    spread: float('L', {
      description: 'half-range of the abscissas (x runs from −L to +L)',
      min: 0.5,
      max: 6,
      step: 0.1,
      default: 3,
      precision: 1,
    }),
    outlier: float('outlier', {
      description: 'offset applied to the LAST point only',
      min: -15,
      max: 15,
      step: 0.5,
      default: 0,
      precision: 1,
    }),
    // no seed here: injected by the core
  },

  groups: [
    { title: 'True line', params: ['a', 'b'] },
    { title: 'Observations', params: ['N', 'sigma', 'spread', 'outlier'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // The data first, with the quantity actually minimised drawn on it: the
    // vertical residual segments. One NaN-separated series does the whole
    // bundle, so no custom view is needed.
    figure(
      'fit',
      scatter('points', {
        color: '#7E2F8E',
        size: 3.8,
        opacity: 0.85,
        label: 'observations',
        overlays: [
          line('residualSegments', {
            color: '#a1a1aa',
            width: 1.2,
            label: 'residuals (what is minimized)',
          }),
          line('truth', { color: '#EDB120', width: 1.6, dashed: true, label: 'true line' }),
          line('fitted', { color: '#0072BD', width: 2.6, label: 'fitted line' }),
        ],
        axes: { x: 'x', y: 'y' },
      })
    ),

    // The diagnostic: with the right model the residuals are a shapeless
    // cloud around zero — any pattern here means the straight line was wrong.
    view(
      'residuals',
      'Residuals',
      scatter('residuals', {
        color: '#D95319',
        size: 3.8,
        opacity: 0.85,
        label: 'y − ŷ',
        overlays: [hline(() => 0, { color: '#a1a1aa', width: 1.4 })],
        axes: { x: 'x', y: 'y − ŷ' },
      })
    ),

    // What the slope is worth: 400 repeated experiments against σ/√Sxx.
    view(
      'slope-law',
      'Distribution of the slope â',
      histogram('slopes', {
        color: '#0072BD',
        opacity: 0.6,
        label: '400 repeated experiments',
        overlays: [
          density('slopePdf', { color: '#EDB120', width: 2.4, label: 'N(a, σ²/Sxx) — theory' }),
          vline((p) => p.a, { color: '#EDB120', dashed: true, width: 1.6, label: 'a' }),
        ],
        axes: { x: 'â', y: 'density' },
      })
    ),
  ],
};
