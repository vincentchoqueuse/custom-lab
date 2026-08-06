// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'converge',
    title: 'A filter that learns',
    view: 'signals',
    params: { algo: 'lms', mu: 0.01, lambda: 1, L: 8, a: 0, snr: 20, n: 240, track: false },
    visible: ['n', 'mu'],
    notes: `The setup: an unknown system with eight coefficients, a white input,
and an output measured at 20 dB of SNR. The filter starts from ZERO and never
sees w*.

Start here, on what the algorithm is actually looking at. The orange dashed
trace is the reference d(n) — the unknown system's output, the only thing the
filter is ever told. The blue trace is its own output y(n), and at n = 240 it
is nowhere near. Below, their difference: the error, which is the ONLY signal
that drives an update.

Now walk n forward — 500, 1000, 3000. The blue trace climbs onto the orange one
and the error collapses towards the noise floor it can never cross. That is the
whole of adaptive filtering, and every other tab is a summary of this one: the
coefficients tab is where the error went, the learning curve is this error
squared and averaged over 24 runs.

On the learning curve there are three curves to read:

  blue     the MSE one would actually measure — it falls and then stops
  orange   the excess w̃ᵀRw̃, the distance to w*, without the noise
  yellow   the σ² floor, which the blue curve will NEVER go below

The question before touching μ: if the step is doubled, where does the curve
go? Two answers will come back, both of them true, and that is the subject of
the next scene.`,
  },
  {
    id: 'tradeoff',
    title: 'Fast or accurate, pick one',
    view: 'learning',
    params: { algo: 'lms', mu: 0.05, lambda: 1, L: 8, a: 0, snr: 20, n: 3000, track: false },
    visible: ['mu', 'snr'],
    notes: `At μ = 0.05 the descent is five times faster — 41 iterations to come
within 3 dB of the plateau against 206 — and the plateau is five times higher.
That is ONE law, not two:

    misadjustment = μ·tr(R) / (2 − μ·tr(R))

The statline gives both numbers, measured and theoretical, and they land on each
other within a few per cent. Worth pointing out: a formula from the lecture,
verified on screen, live.

Then push μ toward divergence and have the room predict WHERE it happens. They
will propose 2/tr(R) = 0.25, the textbook bound. It is wrong, and only just: it
goes at 0.195. The textbook bound makes the MEAN of ŵ converge; it is the
VARIANCE that decides, and its own condition is Σ μλᵢ/(1−μλᵢ) < 2, which gives
0.200 here. The statline shows both.

Above that the curve leaves in a straight line upward and the regime reads
"diverged". A badly tuned adaptive filter does not degrade — it explodes.

And the worst is in the next scene: both bounds assume the regressor independent
of the filter. On a correlated input (a = 0.9) the real threshold falls to 0.037
where the theory announces 0.104, so a setting that is "within spec" diverges.

The remedy is not to lower μ but to change algorithm. NLMS makes the step
DIMENSIONLESS and its bound is 2 whatever the input power, which is why nobody
uses plain LMS in practice.`,
  },
  {
    id: 'colored',
    title: 'A coloured input, or what RLS buys',
    view: 'learning',
    params: { algo: 'lms', mu: 0.01, lambda: 1, L: 8, a: 0.9, snr: 20, n: 3000, track: false },
    visible: ['a', 'algo'],
    notes: `Same filter, same step, same noise. One thing changed: the input is
correlated (a = 0.9) at IDENTICAL power — the √(1−a²) factor is there for that,
otherwise the effect of conditioning would be confused with that of a step grown
too large.

LMS takes 722 iterations to come within 3 dB of the plateau, against 206 on the
white input: three and a half times slower for a signal of the same power. The
statline says why — a conditioning λmax/λmin of 113 at L = 8, tending to
((1+a)/(1−a))² = 361 as L grows. Each eigenmode converges at its own rate, and
the slowest holds everyone up.

The weight plane at L = 2 says the same thing geometrically: the circles have
become ellipses, and the descent zigzags instead of diving.

Then switch the algorithm to RLS and change nothing else. Fifteen iterations —
exactly the same number as on the white input, with the conditioning unchanged
at 113. RLS does not suffer λmax/λmin because it inverts R rather than following
it.

The price is in the operation count: L² instead of L. At L = 8 nobody cares; on
an echo canceller with 512 coefficients it is 262 144 multiplications per sample
against 512.`,
  },
  {
    id: 'track',
    title: 'Tracking a system that moves',
    view: 'learning',
    params: { algo: 'rls', mu: 0.01, lambda: 1, L: 8, a: 0, snr: 20, n: 3000, track: true },
    visible: ['lambda', 'algo'],
    notes: `The system changes abruptly at iteration 1500, marked by the purple
vertical. That is the real case: a speaker moves, a channel drifts, a room
changes.

Let the room OBSERVE before explaining. With λ = 1, RLS is the best of the three
BEFORE the jump — an excess of −44 dB, with nothing close. After the jump it
climbs to +4 dB, and 1500 iterations later it is still at −1 dB. It never caught
up. The best algorithm of the previous scene is the worst here, by a wide
margin.

The reason is one word: λ = 1 means INFINITE memory. RLS has accumulated 1500
equations describing the old system, and it needs as long again to drown them
under new ones.

Lowering λ to 0.99 makes the memory about 1/(1−λ) = 100 samples. The excess
restarts from −34 dB and is back to −34 dB by iteration 2200. The price is that
the pre-jump plateau went from −44 to −34 dB, which is exactly the
misadjustment (1−λ)L/2 — the same bargain again, under another name.

Switching back to LMS at μ = 0.01 gives the same figures as RLS at λ = 0.99, to
within 0.2 dB. And pushing μ to 0.05 nearly hides the jump altogether — −25.7 dB
before, −24.2 just after — at the cost of a plateau 8 dB higher. "The dumbest of
the three is the best when the world moves" is a sentence that sticks, and here
it is measured.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
