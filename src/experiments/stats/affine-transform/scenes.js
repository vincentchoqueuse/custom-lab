// Lecture script. Auto-discovered by the registry.
// PLAN — ATLAS: three transforms visited in turn, not one argument in three beats.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'shift',
    title: 'Shifting: b (a = 1)',
    params: { law: 'gaussian', a: 1, b: 2 },
    visible: ['a', 'b', 'law'],
    notes: `With a = 1, moving b slides the orange curve as a whole. The statline
follows: E[Y] = E[X] + b moves with it, while Var(Y) does not move at all.

The question worth asking here is why the variance is blind to b. The answer is
in the definition rather than in the picture: variance measures spread about the
mean, and the mean has shifted along with everything else.`,
  },
  {
    id: 'stretch',
    title: 'Stretching: a (b = 0)',
    params: { law: 'gaussian', a: 2, b: 0 },
    visible: ['a', 'b'],
    notes: `Raising a widens the curve and flattens it at the same time, because
the area under a density is always 1. The statline shows the price: taking a
from 1 to 2 quadruples the variance, since Var(Y) = a²·Var(X).

Asking what happens to E[Y] is a fair trap — it stays at zero as long as
E[X] = 0 and b = 0, which is exactly the case on screen. The uniform
distribution makes the stretching easier to see, its plateau being a ruler.`,
  },
  {
    id: 'flip',
    title: 'Flipping: a < 0',
    params: { law: 'exponential', a: -1, b: 0 },
    visible: ['a', 'b', 'law'],
    notes: `Taking a = −1 on an exponential mirrors the density about the origin
and puts E[Y] at −1. The formula f_Y(y) = f_X((y−b)/a)/|a| needs the absolute
value, not a, and this scene is where that detail stops being a typographic
convention: with a negative, the density would come out negative.

The "Histogram of Y" view is worth a moment as confirmation — the transformed
draws land on the transformed density, having never been told about it.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
