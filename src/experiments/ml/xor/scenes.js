// Lecture script — auto-discovered by the registry.
// PLAN — problem 1 · method 2 · problem 3-4. NO CONTEXT SCENE, deliberately: the
// 1969 counter-example IS the opening.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'perceptron',
    title: 'A straight line cannot do it',
    view: 'plane',
    params: { problem: 'xor', hidden: 1, act: 'identity', lr: 0.5, epoch: 4000 },
    visible: ['problem', 'hidden'],
    notes: `Four points, two classes. The room should be asked, before anything
is run, to draw on the board the line separating the orange points from the
blue ones, and given thirty seconds to try. There is none.

The single linear neuron has converged, and its boundary does not even appear:
its output is constant at 1/2, so it never crosses the threshold. The final
error is 1/8 = 0.125, and that is the OPTIMUM rather than a failure of the
descent — the harness proves it, showing that the best least-squares line is
the constant 1/2, and that no line whatsoever classifies the four points
correctly.

Switching the table to OR and then to AND makes a boundary appear and the error
fall. Those two are separable and XOR is not. That difference is what Minsky
and Papert published in 1969, and perceptron funding stopped for fifteen
years.`,
  },
  {
    id: 'two',
    title: 'Two neurons settle it',
    view: 'plane',
    params: { problem: 'xor', hidden: 2, act: 'tanh', lr: 0.5, epoch: 4000 },
    visible: ['hidden', 'epoch'],
    notes: `With H = 2 and a tanh activation the boundary is no longer a line but
a band, and it separates.

The two grey lines are the hidden neurons, each drawing its own line. Neither
separates the XOR alone; their combination does. That is what a hidden layer
is — cutting the plane into pieces and then recombining them.

The solution can even be written by hand: h₁ = OR, h₂ = AND, output = h₁ − h₂.
"Or, but not both" is the definition of XOR, in one subtraction, and the
harness verifies that this construction reproduces the table exactly.

Sweeping the epoch dial from 0 to 4000 then shows the boundary folding. It
starts straight, because the network starts linear, and it is the nonlinearity
that takes it out of there.`,
  },
  {
    id: 'plateau',
    title: 'The plateau, and why it frightens people',
    view: 'learning',
    params: { problem: 'xor', hidden: 2, act: 'tanh', lr: 0.15, epoch: 4000 },
    visible: ['lr', 'epoch'],
    notes: `The curve does not fall immediately. It sits on the orange line —
the 1/16 floor of the linear model — for hundreds of epochs, then breaks away.

This is a PLATEAU and it deserves the name: the network first learned what a
linear model would have learned, namely the mean. While it is there the
gradient is nearly zero and nothing appears to be happening. Then the symmetry
breaks and the error falls by several decades.

Anyone who stopped training at epoch 200 would have concluded that it does not
work, which is the most common mistake in the entire field.

Raising η to 1 brings the breakaway much earlier. Pushing it to 5 makes
training erratic, with the curve climbing back in places — the same
speed-against-stability trade-off as in adaptive filtering, on the same page of
the same book.`,
  },
  {
    id: 'seed',
    title: 'The initial randomness decides',
    view: 'learning',
    params: { problem: 'xor', hidden: 2, act: 'tanh', lr: 0.5, epoch: 4000 },
    visible: ['hidden', 'act'],
    notes: `Hammering R gives a different curve for every initialization: the
plateau ends at epoch 39 for one draw and 1077 for another, and some never
leave it at all.

That is not an implementation defect but a property of the problem. The error
surface of a network is not convex, and two neighbouring initial weights fall
into two different valleys. A network that "does not learn" has sometimes
merely started badly.

The numbers, measured over 40 draws and verified by the harness:

    tanh  H = 2  →  34/40 succeed
    tanh  H = 4  →  40/40
    ReLU  H = 2  →   4/40
    ReLU  H = 4  →  20/40

Two lessons, and the second one always surprises.

The first: width helps. Two neurons are ENOUGH, but four do not represent more
— they offer more PATHS to the solution. This is one of the reasons large
networks train better than small ones, and there is nothing intuitive about it.

The second: ReLU, the default activation of the whole field, fails here nine
times out of ten at H = 2. A ReLU neuron whose input is negative at all four
points has zero gradient — it is DEAD, permanently, leaving one neuron for a
problem that needs two. Letting the room observe it before explaining it is
worth the detour: "the most widely used activation in the world is the worst
one on this example" is a sentence that wakes a lecture hall.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
