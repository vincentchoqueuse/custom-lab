// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'tau',
    title: 'τ, and nothing else',
    params: { K: 1, tau: 1, tz: 0 },
    view: 'step',
    visible: ['tau', 'K'],
    notes: `The pure first order: an exponential with a single shape parameter.
The three graphical readings of the course are worth saying out loud. At t = τ
the output is at 63 % of its final value. At t = 3τ it is at 95 %, which is the
5 % settling time quoted in a specification, and the statline displays 3τ. And
the tangent at the origin meets the final value exactly at t = τ.

Moving τ stretches the curve while all four markers follow effortlessly. The
question to ask: what does the gain K change about the speed? Nothing at all,
which is what makes τ interesting.`,
  },
  {
    id: 'impulse',
    title: 'The impulse response is the derivative',
    params: { K: 1, tau: 1, tz: 0 },
    view: 'impulse',
    visible: ['tau', 'K'],
    notes: `The same system with a different input: h(t) = (K/τ)·e^{−t/τ}, which
starts at K/τ and decays with the SAME time constant.

The link is worth making explicitly: h is the derivative of the step response,
and the harness verifies it numerically. That is why both curves share τ — and
why a slow system is also a soft one. The area under h is K, the static gain:
integrating an impulse gives the step back.`,
  },
  {
    id: 'pole',
    title: 'One pole, one speed',
    params: { K: 1, tau: 1, tz: 0 },
    view: 'poles',
    visible: ['tau', 'K'],
    notes: `The pole sits at −1/τ, alone on the real axis. Moving τ slides it: the
further from the imaginary axis, the faster the system.

The question to ask is what would happen if it crossed to the RIGHT. The answer
is e^{+t/|τ|} and a diverging output — that is instability, and it is all there
is to remember about the right half-plane. Going back to the step tab ties the
pole position to the shape.`,
  },
  {
    id: 'bode',
    title: 'The same system, seen in frequency',
    params: { K: 1, tau: 1, tz: 0 },
    view: 'gain',
    visible: ['tau', 'K'],
    lock: true,
    notes: `The axes are pinned, so moving τ slides the corner without the frame
moving. The cutoff is at ω = 1/τ, exactly the pole with its sign changed — one
number, two readings — and beyond it the slope is −20 dB per decade, always.

The phase tab reads −45° exactly at the corner and −90° at infinity. Fast in
time means wide in frequency: the same trade-off as truncation, seen from
control.`,
  },
  {
    id: 'zero',
    title: 'One zero, and the output jumps',
    params: { K: 1, tau: 1, tz: 0.5 },
    view: 'step',
    visible: ['tz', 'tau'],
    notes: `The 63 %/τ and 95 %/3τ markers have gone, deliberately: they only hold
for the PURE first order. The tangent stays, its identity surviving the zero.

With a zero, the output no longer starts from zero but JUMPS to K·τ_z/τ, the
initial value shown in the statline. The numerator differentiates the input, and
the derivative of a step is a step.

Raising τ_z past τ pushes the jump above the final value, so the response comes
back down — that is phase lead, the thing a PD controller manufactures on
purpose. The impulse tab shows what the zero added: a Dirac, whose weight is
displayed. A system that responds instantaneously looks like that.`,
  },
  {
    id: 'nmp',
    title: 'Non-minimum phase: it starts the wrong way',
    params: { K: 1, tau: 1, tz: -0.6 },
    view: 'step',
    visible: ['tz', 'tau'],
    notes: `A negative τ_z puts the zero in the RIGHT half-plane, and the output
starts by going the wrong way before coming back — the inverse overshoot, in the
statline.

This is not a curiosity: it is the behaviour of an aircraft that dips when the
stick is pulled, of a nuclear reactor, of a domestic hot-water tank. Whether it
can be fixed by speeding up the loop is the question, and the answer is no —
that is the fundamental limit the whole control course will meet.

The poles tab shows the zero plainly on the right. The phase tab dives toward
−180° instead of −90°, while the gain says nothing at all.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
