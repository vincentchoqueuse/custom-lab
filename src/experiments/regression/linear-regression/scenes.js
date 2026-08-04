// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'least-squares',
    title: 'Scene 1 · What "least squares" means',
    params: { a: 1.5, b: 1, sigma: 1, N: 20, spread: 3, outlier: 0 },
    view: 'fit',
    visible: ['sigma'],
    notes: `The vertical grey segments are the quantity being minimized — the
sum of their squares, printed in the statline. Not the distance to the line,
not the horizontal gap: the VERTICAL gap, because y is what is being predicted
from x.

With the yellow true line and the blue fitted one both on screen, the question
is why they do not coincide. They cannot: the line is never observed, only
twenty noisy points are. Pressing R to redraw makes the blue line dance around
the yellow one, which is already the third scene.`,
  },
  {
    id: 'residuals',
    title: 'Scene 2 · The residuals, the only honest diagnostic',
    params: { a: 1.5, b: 1, sigma: 1, N: 40, spread: 3, outlier: 0 },
    view: 'residuals',
    visible: ['sigma', 'N'],
    notes: `With the right model the residuals have no structure at all: a
shapeless cloud around zero. This is what to look at before believing any R².

Two properties are exact rather than approximate, and the harness verifies
both: the residuals sum to zero, and their inner product with x is zero. The
line has extracted everything x could say about y, and what remains is
orthogonal to it. When a curvature appears in this view, the straight line has
stopped being enough — which is where polynomial regression begins.`,
  },
  {
    id: 'leverage',
    title: 'Scene 3 · Spreading the x beats adding more',
    params: { a: 1.5, b: 1, sigma: 1.5, N: 20, spread: 1, outlier: 0 },
    view: 'slope-law',
    visible: ['spread', 'N'],
    lock: true,
    notes: `Four hundred repeated experiments make the histogram the
distribution of â, and its theoretical width σ/√Sxx is superimposed in yellow.

The question to ask before moving anything: to estimate the slope better, is it
better to double the number of points or to double the range of x? Doubling L
halves the standard deviation, doubling N only divides it by √2, and the two
markers in the statline confirm it. That is experimental design in one
sentence — where the points are placed matters more than how many there are.`,
  },
  {
    id: 'outlier',
    title: 'Scene 4 · One point is enough to bend everything',
    params: { a: 1.5, b: 1, sigma: 0.6, N: 20, spread: 3, outlier: 0 },
    view: 'fit',
    visible: ['outlier'],
    notes: `Freezing a clean fit and then dragging the last point away shows the
blue line following it. Squaring the errors gives the largest one a crushing
weight, and the point sits at the edge of the range, so its leverage is maximal
— which is exactly what the previous scene measured.

R² collapses, and the residuals view is more informative still: one enormous
isolated residual is the signature of a bad data point rather than a bad model.
Least squares has no defence at all against a wrong value, which is the door
into robust methods.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
