// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2-3 · method 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'close',
    title: 'Closing the loop, and seeing what changes',
    params: { w0: 1, m: 0.5, K: 4 },
    view: 'response',
    visible: ['K', 'm'],
    notes: `One dial: K. Starting at K = 0.1, where the loop barely acts, and
climbing slowly to 4.

The question belongs before the dial moves: what changes when the loop is
tightened? Collect the answers, then show the three that matter. The output
comes closer to the setpoint, the remaining error being 1/(1+K), which is 20 %
at K = 4 as the statline says. The system OVERSHOOTS, more and more. And — this
is where it snags — the settling time DOES NOT MOVE.

Freezing at K = 1 before climbing makes it undeniable: both curves decay at the
same rate, and the drawer shows mω₀ identical in open and closed loop. The
reason is algebraic: s² + 2mω₀s + ω₀²(1+K). K enters ONLY the constant term, so
it moves ω₀ and not the real part of the poles.`,
  },
  {
    id: 'faster',
    title: 'Faster and less damped, in the same ratio',
    params: { w0: 1, m: 0.5, K: 4 },
    view: 'gain',
    visible: ['K', 'w0'],
    lock: true,
    notes: `The same gesture, read in frequency. The blue curve is |L| = |K·G|,
the red one the closed loop |T|.

At low frequency T starts at K/(1+K), so closer and closer to 0 dB — that is the
steady-state error seen from the other side. The bandwidth widens, ω₀ becoming
ω₀√(1+K), a factor 2.24 at K = 4. And a bump appears, because m becomes
m/√(1+K).

Both effects come from the SAME √(1+K), which is the sentence to have said out
loud: with a plain gain, one cannot speed a system up without de-damping it.
That is exactly why the PID exists. The Bode phase tab carries the same
information — the closed-loop phase is steeper.`,
  },
  {
    id: 'resonance',
    title: 'A well-behaved plant that starts to resonate',
    params: { w0: 1, m: 0.8, K: 1 },
    view: 'gain',
    visible: ['K', 'm'],
    notes: `At m = 0.8 > 1/√2 the plant ALONE does not resonate, and the blue
curve has no bump at all. That is worth establishing first.

Then raise K. The threshold is exact: the closed loop resonates as soon as
m/√(1+K) < 1/√2, that is as soon as K > 2m² − 1 = 0.28 here. The red bump
therefore appears almost immediately, on a plant that was perfectly calm.

The sentence to keep: resonance is not a property of the system, it is a
property of the loop.`,
  },
  {
    id: 'nichols',
    title: 'The chart: reading the CLOSED loop on the OPEN one',
    params: { w0: 1, m: 0.5, K: 4 },
    view: 'black',
    visible: ['K', 'm'],
    notes: `Only the open loop is drawn here — the blue locus, |L| in dB against
arg L. The grey contours are the chart: every point of the plane giving the same
CLOSED-loop gain, |L/(1+L)| = M.

The yellow contour is the one the locus TOUCHES, and its value is the
closed-loop resonance: 5.3 dB here, shown in the statline.

The point to hammer: the closed loop was never drawn on this view. A property of
the closed system is read off the drawing of the open one — which is exactly
what a chart is for, and why it was used before computers.

The honest check: go back to the Bode gain tab and read the height of the red
bump. Same number, and the harness verifies the equality to 0.2 %. Then raise K:
the locus rises, the tangency jumps from contour to contour, and the resonance
climbs. Have the direction predicted before moving.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
