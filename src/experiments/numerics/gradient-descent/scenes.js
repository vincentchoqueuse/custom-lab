// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'zigzag',
    title: 'The valley and the zigzag',
    params: { fn: 'quad', kappa: 10, alpha: 0.18, beta: 0.9, N: 30 },
    visible: ['alpha', 'kappa'],
    notes: `At κ = 10 the ellipses are ten times steeper along y than along x.
The gradient, in blue, descends perpendicular to the level curves, which means
it zigzags across the valley rather than running along it. Newton, in orange,
bends that direction by H⁻¹ and reaches the bottom in a single step — exactly,
because the landscape is quadratic.

Raising κ to 100 leaves the blue path nearly stationary while the orange one is
unaffected. Pushing α past 2/κ, the value shown in the drawer, produces
divergence live. Momentum, in green, smooths the zigzag by averaging successive
back-and-forth steps.`,
  },
  {
    id: 'rate',
    title: 'The slope IS the conditioning',
    params: { fn: 'quad', kappa: 30, alpha: 0.064, beta: 0.9, N: 60 },
    view: 'convergence',
    visible: ['kappa', 'alpha'],
    notes: `On a logarithmic axis the gradient is a straight line: linear
convergence with ratio ((κ−1)/(κ+1))² at the optimal step α = 2/(κ+1), which
the drawer displays. Newton takes a few points and then hits the machine floor,
its quadratic convergence doubling the number of correct digits at each
iteration.

The question that follows is why Newton is not always used, and the answer is
the cost of H⁻¹ — O(n³), with n in the billions inside a neural network.
Momentum exists in that gap: nearly Newton's rate at the gradient's price.`,
  },
  {
    id: 'banana',
    title: 'Rosenbrock, the curved valley',
    params: { fn: 'rosenbrock', alpha: 0.0015, beta: 0.9, N: 100 },
    visible: ['fn', 'alpha'],
    notes: `Real landscapes are not quadratic. The Rosenbrock valley is curved
and its floor is nearly flat, so the gradient — with a minute α, since the
curvature reaches about 1000 at the edges — crawls along the banana while
Newton follows the curvature and arrives in a handful of iterations.

The convergence view shows the gradient stagnating for dozens of iterations.
That is the everyday reality of optimization, and the reason the whole zoo of
algorithms between these two extremes exists at all: BFGS, Adam, and the rest.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
