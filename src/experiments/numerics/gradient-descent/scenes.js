// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3 · problem 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'bowl',
    title: 'A round bowl, and the descent goes straight in',
    view: 'landscape',
    params: { fn: 'quad', kappa: 1, alpha: 0.18, beta: 0.27, N: 30 },
    visible: ['kappa', 'alpha'],
    notes: `κ = 1: the contours are circles, and the gradient at every point
aims exactly at the minimum. The path is a straight line.

Say why, because it is the whole reason the next scene is surprising. The
gradient is orthogonal to the level set. On a circle, orthogonal to the level
set means radial — pointing at the centre. On an ellipse it does not, and there
is nothing more to the zigzag than that.

Raise α and the descent takes bigger steps down the same straight line, until
it overshoots and oscillates about the minimum. Note the value where that
starts: it is 2/L, and on this bowl the room can predict it.

Now turn κ up, one step at a time — 2, then 5, then 10 — and watch the straight
line bend. That is the next scene, and the room will already know what it is
looking at.`,
  },

  {
    id: 'zigzag',
    title: 'The valley and the zigzag',
    params: { fn: 'quad', kappa: 10, alpha: 0.18, beta: 0.27, N: 30 },
    visible: ['alpha', 'kappa', 'beta'],
    notes: `At κ = 10 the ellipses are ten times steeper along y than along x.
The gradient, in blue, descends perpendicular to the level curves, which means
it zigzags across the valley rather than running along it. Newton, in orange,
bends that direction by H⁻¹ and reaches the bottom in a single step — exactly,
because the landscape is quadratic.

Raising κ to 100 leaves the blue path nearly stationary while the orange one is
unaffected. Pushing α past 2/κ, the value shown in the drawer, produces
divergence live.

Momentum, in green, smooths the zigzag by averaging successive back-and-forth
steps — but only at the right β, and that is worth a demonstration of its own.
The drawer gives the optimal value, ((√κ−1)/(√κ+1))², which is 0.27 here and
not the 0.9 everybody reaches for. Freeze (F), then take β up to 0.9: the green
path stops smoothing anything and swings twice as wide as the blue one. A heavy
ball that is too heavy RINGS. Turned the other way, at β = 0, the green path
disappears under the blue one — momentum with no memory IS the gradient.`,
  },
  {
    id: 'rate',
    title: 'The slope IS the conditioning',
    params: { fn: 'quad', kappa: 30, alpha: 0.064, beta: 0.478, N: 60 },
    view: 'convergence',
    visible: ['kappa', 'alpha'],
    notes: `On a logarithmic axis the gradient is a straight line: linear
convergence with ratio ((κ−1)/(κ+1))² at the optimal step α = 2/(κ+1), which
the drawer displays. Sixty iterations to gain half a decade.

Newton leaves the picture on the FIRST step. Not "converges fast" — on a
quadratic it is exact, since one Newton step solves ∇f = 0 and ∇f is affine
here. Its line runs along the bottom of the frame because the figure cannot
show what it reached; the harness can, and pins it at 1e-32, which is machine
precision squared.

Momentum, in green, is the interesting one: a straight line too, but a steeper
one — the rate goes from ((κ−1)/(κ+1))² to (√κ−1)/(√κ+1), the square root, and
four orders of magnitude at sixty iterations. That is the whole trick, and it
costs one extra vector in memory.

The question that follows is why Newton is not always used, and the answer is
the cost of H⁻¹ — O(n³), with n in the billions inside a neural network.
Momentum exists in that gap: much of Newton's benefit at the gradient's price.`,
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
