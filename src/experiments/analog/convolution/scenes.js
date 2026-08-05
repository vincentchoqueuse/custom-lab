// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'slide',
    title: 'Flip, slide, integrate',
    params: { sig: 'gate', ker: 'gate', a: 1, b: 1, t: 0.4 },
    view: 'overlap',
    visible: ['t'],
    notes: `The formula belongs on the board before the screen is opened:
y(t) = ∫ x(τ)·h(t − τ) dτ. Then the question that stops everyone: what is being
integrated over? Over τ. The t is FROZEN during the integral and moves only
between two integrals, which is why this view has τ on its axis and not t.

Three curves: x(τ) in purple, motionless; h(t − τ) in orange, h FLIPPED — that
is the minus sign — and then SLID by t; their product in blue, whose blue area
IS y(t).

Sliding t slowly is the animation, done by hand. Having the room narrate it out
loud works well: the orange gate enters from the left, overlaps more and more,
then leaves. The lower curve should stay hidden for now.`,
  },
  {
    id: 'triangle',
    title: 'Two gates give a TRIANGLE',
    params: { sig: 'gate', ker: 'gate', a: 1, b: 1, t: 1 },
    view: 'response',
    visible: ['t'],
    notes: `The prediction is worth collecting first: two square gates, so surely
a square output. That is the spontaneous answer and it is wrong.

Revealing the curve gives a triangle. Going back to the computation tab and
sliding t explains why, through the four regimes the statline announces: below
t = 0 there is no overlap and y = 0; between 0 and 1 the overlap grows
proportionally to t, so the rise is a straight line rather than a curve; at
t = 1 the overlap is maximal, giving the apex; beyond it the overlap shrinks,
and the fall is straight for the same reason.

The triangle is not a chosen shape, it is the geometry of two overlapping
rectangles. The harness checks the closed form to 1e-12.`,
  },
  {
    id: 'widths',
    title: 'Widths add, areas multiply',
    params: { sig: 'gate', ker: 'gate', a: 2, b: 0.5, t: 1 },
    view: 'response',
    visible: ['a', 'b'],
    lock: true,
    notes: `Two gates of DIFFERENT widths turn the triangle into a trapezoid,
with base a + b, plateau |a − b| and height min(a, b).

Two rules are worth discovering by moving a and b. The support WIDTH adds:
supp(y) = supp(x) + supp(h), which the drawer displays. The AREA, on the other
hand, MULTIPLIES: ∫y = ∫x · ∫h, in the statline — with two gates of unit area
the triangle has area 1, which is worth checking rather than asserting.

Setting a = b sends the plateau |a − b| to zero and the trapezoid back to the
triangle of the previous scene. A special case, not a separate one.`,
  },
  {
    id: 'commute',
    title: 'Which one gets flipped? (it makes no difference)',
    params: { sig: 'gate', ker: 'gate', a: 2, b: 0.5, t: 1 },
    view: 'overlap',
    visible: ['a', 'b'],
    notes: `On the drawing nothing looks symmetric: h is the one being flipped
and slid, x never moves. One would expect the order to matter.

Swapping a and b — 2 and 0.5 becoming 0.5 and 2 — changes the computation view
COMPLETELY, since a different gate is now sliding. The lower curve is
identical.

x * h = h * x, verified to 1e-12 along the whole curve. The moral is that the
flip is an artefact of the CALCULATION and not a property of the system: one
flips whichever of the two makes the drawing simpler.`,
  },
  {
    id: 'rc',
    title: 'The same integral is the charging of an RC',
    params: { sig: 'gate', ker: 'exp', a: 1.5, b: 0.4, t: 1 },
    view: 'response',
    visible: ['t', 'b'],
    notes: `Changing h to an exponential e^(−t/b)/b makes it the impulse response
of an RC with time constant b, and the output is the curve everyone has already
drawn in a lab session: charging as 1 − e^(−t/b) while the pulse lasts, then
discharging as e^(−(t−a)/b).

The point to land is that this is not one more formula. It is the same integral
as the triangle with a different h. Going back to the computation tab and
sliding t shows the flipped exponential sweeping the gate exactly as the gate
did.

Playing with b closes the scene: small b and the output copies the input, the
RC keeping up; large b and it integrates and smooths, the RC being too slow.
The low-pass filter, seen in time, before any Bode plot has been drawn.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
