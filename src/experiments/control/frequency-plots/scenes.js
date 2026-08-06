// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-5 · problem 6
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'first',
    title: 'A first order, read four times',
    params: { sys: 'first', K: 1, tau: 1, wc: 1 },
    view: 'gain',
    visible: ['sys', 'wc'],
    notes: `The rule of the game belongs first: all four tabs plot THE SAME
complex number H(jω). Nothing changes between them except the way of looking at
it.

Put ω_c on 1 rad/s = 1/τ and read the two statline values, −3.01 dB and −45°.
Then find those same two numbers everywhere: on the Bode gain, the height of the
yellow line; on the Bode phase, its height there too; on Nyquist, the length of
the segment from the origin to the yellow point, and its angle; on Black, the
abscissa and the ordinate of the yellow point.

Four readings, two numbers. Only then slide ω_c and watch the yellow point run
along all four curves at once.`,
  },
  {
    id: 'halfcircle',
    title: 'The first order IS a half-circle',
    params: { sys: 'first', K: 1, tau: 1, wc: 1 },
    view: 'nyquist',
    visible: ['wc', 'K'],
    notes: `The Nyquist locus of a first order is an exact half-circle, centred at
K/2 on the real axis with radius K/2, which the harness verifies to 1e-15.

Let it be observed: at ω = 0 it starts at K on the real axis, at ω → ∞ it
arrives at the origin, and ω_c = 1/τ sits exactly at the TOP, at −45°.

Why the phase never goes below −90° then answers itself: the half-circle stays
in the lower right quadrant, and the geometry replies before the algebra does.
Moving K grows the circle and leaves the angles alone.`,
  },
  {
    id: 'damped',
    title: 'A damped second order (m = 1.2)',
    params: { sys: 'second', K: 1, w0: 1, m: 1.2, wc: 1 },
    view: 'gain',
    visible: ['m', 'wc'],
    notes: `At m = 1.2 > 0.707 there is no bump at all. The gain falls quietly,
the phase goes to −180° (two poles, twice −90°), the Nyquist locus makes a
complete half-turn and Black descends diagonally.

Putting ω_c on ω₀ = 1 rad/s gives exactly −90° in the statline — always true at
ω₀, whatever m is, and the harness verifies it. Keep this picture in mind: the
next scene changes ONLY m.`,
  },
  {
    id: 'resonant',
    title: 'A resonant second order (m = 0.3)',
    params: { sys: 'second', K: 1, w0: 1, m: 0.3, wc: 1 },
    view: 'gain',
    visible: ['m', 'wc'],
    lock: true,
    notes: `The same system with m brought down to 0.3. The bump appears:
+4.85 dB at ω_r = ω₀√(1−2m²) = 0.91 rad/s, marked in orange with the values in
the statline.

Touring the other views with ω_c on ω_r is worth the time. On Nyquist the locus
SWELLS and the yellow point moves away from the origin; on Black a nose appears
toward the left, which is the same bump lying down.

Then raise m slowly toward 0.707 and have the moment the bump disappears
announced. The threshold is exact rather than approximate: above 1/√2 there is
no maximum at all, and the drawer says so. The question that remains — the time
response overshoots as soon as m < 1, so why two different thresholds? — belongs
with the second-order response experiment.`,
  },
  {
    id: 'margins',
    title: 'The margins, read on all three diagrams',
    params: { sys: 'openloop', K: 1, tau: 1, wc: 0.78 },
    view: 'gain',
    visible: ['K', 'wc'],
    notes: `At last a system where the −1 point is good for something. A stable
first or second order has INFINITE margins, because its phase never reaches
−180°. The open loop K/(jω(1+jωτ)(1+jωτ/5)) does reach it at a finite frequency,
so both margins exist.

Two vertical lines are drawn on the two Bode plots. The purple one, ω at 0 dB =
0.78 rad/s, is where the phase margin is read on the phase diagram: the gap up
to −180°, here 43.2°. The orange one, ω at −180° = 2.24 rad/s, is where the gain
margin is read on the gain diagram: the gap up to 0 dB, here 15.6 dB. Two lines,
two gaps, two numbers, all in the statline.

On Nyquist the same two numbers are two constructions. For the gain margin, the
curve crosses the negative real axis at −1/6 ≈ −0.167, leaving a factor of 6
before −1, and 20·log₁₀(6) = 15.6 dB. For the phase margin, where the curve
leaves the drawn unit circle, the angle remaining to the −180° ray is 43.2°.

And on Black the phase margin is the HORIZONTAL gap to the critical point and
the gain margin the VERTICAL one. The critical point is the same everywhere and
so are the margins; only the axes have turned.`,
  },
  {
    id: 'unstable',
    title: 'Raising K until the loop diverges',
    params: { sys: 'openloop', K: 1, tau: 1, wc: 2.24 },
    view: 'nyquist',
    visible: ['sys', 'K'],
    notes: `One control: K. Freeze at K = 1, then climb.

Ask first what moves when K increases. The answer to obtain: the locus GROWS,
scaled about the origin, and the −1 point does not move — which is the whole
idea of the Nyquist criterion. The frequency at −180°, √5/τ, does NOT depend on
K: the locus always crosses the real axis at the same point along the curve,
only further and further from the origin.

At K = 6 the locus passes EXACTLY through −1, both margins fall to zero together
in the statline, and the drawer reads "unstable". K_crit = (τ₁+τ₂)/(τ₁τ₂) = 6/τ
exactly, verified by the harness.

Beyond it the margins go negative and the closed loop diverges; Black shows the
same thing, the curve passing to the left of the critical point. A last gesture:
bring τ down to 0.5 and have K_crit predicted before it is read.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
