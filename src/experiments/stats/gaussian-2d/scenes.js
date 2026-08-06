// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'correlation',
    title: 'ρ tilts the cloud',
    params: { rho: 0.6, N: 500 },
    visible: ['rho', 'N'],
    notes: `Sliding ρ from −0.95 to 0.95 flattens the cloud along a line, and the
ellipses follow because they are the exact level curves of the density, not a
summary of the points. At ρ = 0 they align with the axes, which in the Gaussian
case — and only there — means independence.

Pressing R changes the cloud and leaves the ellipses where they are, which is
the distinction between a model and the data drawn from it. The three ellipses
hold roughly 39 %, 86 % and 99 % of the points; the first number surprises a
room that expects the one-dimensional 68 %.`,
  },
  {
    id: 'regression',
    title: 'Regression ≠ principal axis',
    params: { rho: 0.6, sigmax: 1.5, sigmay: 1.5, N: 1000 },
    visible: ['rho', 'N'],
    notes: `Two lines cross the same cloud: the major axis in purple and
E[Y|X = x] in green. The green one is flatter, and that gap is regression to the
mean — at an extreme X, the expected Y falls back toward μᵧ rather than staying
on the axis of the cloud.

The two coincide only as |ρ| approaches 1. Lowering ρ separates them further:
the regression line flattens toward the horizontal while the major axis does
not move, since it answers a different question about the same ellipse.`,
  },
  {
    id: 'marginals',
    title: 'The marginals ignore ρ',
    params: { rho: 0.9, sigmax: 1.5, sigmay: 1 },
    view: 'marginals',
    visible: ['rho', 'sigmax'],
    notes: `Moving ρ across its whole range changes nothing on this view. All the
dependence lives in the joint distribution and none of it survives the
projection onto either axis.

Going back to the cloud view for the contrast sets up the question: are two
Gaussian marginals enough to determine the joint distribution? They are not, and
this pair of views is the shortest proof of it available in a lecture.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
