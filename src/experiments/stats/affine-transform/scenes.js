// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'shift',
    title: 'Shifting: b (a = 1)',
    params: { law: 'gaussian', a: 1, b: 2 },
    visible: ['a', 'b', 'law'],
    notes: `a = 1: moving b slides the orange curve AS A WHOLE.
Watch the statline: E[Y] = E[X] + b follows, Var(Y) does NOT move.
Question: "why is the variance blind to b?"
(variance measures the spread about the mean — which shifts along with it).`,
  },
  {
    id: 'stretch',
    title: 'Stretching: a (b = 0)',
    params: { law: 'gaussian', a: 2, b: 0 },
    visible: ['a', 'b'],
    notes: `Raise a: the curve widens AND flattens — the area stays 1.
Var(Y) = a²·Var(X): taking a from 1 to 2 quadruples the variance (statline).
Trick question: "and E[Y]?" — zero, as long as E[X] = 0 and b = 0.
With the uniform distribution the plateau makes the effect even clearer.`,
  },
  {
    id: 'flip',
    title: 'Flipping: a < 0',
    params: { law: 'exponential', a: -1, b: 0 },
    visible: ['a', 'b', 'law'],
    notes: `a = −1 on an exponential: the density flips like a mirror image,
E[Y] = −1. The formula f_Y(y) = f_X((y−b)/a)/|a| needs |a|, not a —
which is exactly what this scene shows.
Switch to "Histogram of Y": the transformed draws land right on it.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
