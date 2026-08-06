// Lecture script. Auto-discovered by the registry.
const BASE = { N: 64, L: 4, mod: 'qpsk', M: 600, gamma: 5, seed: 34 };

// PLAN — problem 1 · method 2-3. NO CONTEXT SCENE.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'between-the-samples',
    title: 'The peak is between the samples',
    view: 'envelope',
    params: { ...BASE },
    visible: ['L', 'N'],
    notes: `Sixteen sample periods around the peak of one OFDM symbol. The grey
line is the envelope drawn at ×32 — near enough to the continuous signal for
this argument — and the blue stems are what the IFFT actually produced.

Take L down to 1 first, so only the stems and their horizontal are on screen,
and ask the room to read the peak. Then take L back up and watch the ORANGE
horizontal appear above the blue one. Both are the PAPR of the same symbol,
over the whole symbol; the gap between them is what the critical rate could not
see, and the statline prints it.

Press R a few times. The gap moves — sometimes it is a tenth of a dB, sometimes
more than two — because whether the peak lands near a sample is luck. What does
not move is its sign: oversampling never finds LESS than the IFFT did, and it
cannot, since the IFFT samples are among the ones it looks at.

The sentence to leave here: an amplifier is sized for what the antenna
transmits, and the IFFT is not what the antenna transmits.`,
  },
  {
    id: 'how-often',
    title: 'How often does it cross?',
    view: 'envelope',
    params: { ...BASE, gamma: 4 },
    visible: ['gamma', 'N'],
    notes: `Same figure, one more line: the green horizontal is γ, the peak power
an amplifier can pass before it clips. Everything under it is transmitted as
sent; everything over it is not.

Take γ down from 8 and watch the green line come to meet the envelope. There is
a value where it grazes the highest lobe — read it, and read the statline: at
that γ, P(PAPR > γ) is the fraction of symbols that would clip. Press R a few
times at a fixed γ and the fraction stays put while WHICH symbols clip changes.

Then take N from 64 to 1024. The envelope looks the same — noise-like, the same
average — and the crossings become more frequent, because more carriers means
more chances for some of them to line up. That is the whole of the N dependence,
and it is why the next tab exists.`,
  },
  {
    id: 'the-tail',
    title: 'What a designer actually buys',
    view: 'ccdf',
    params: { ...BASE, M: 2000 },
    visible: ['gamma', 'N', 'L'],
    notes: `Nobody sizes an amplifier on a mean. The question is "how often will
the signal exceed what I built for", and this curve answers it: for each level
γ, the fraction of symbols whose peak goes past it.

Read one point out loud. At the level where the curve crosses 10⁻³, one symbol
in a thousand clips — at 12 000 symbols a second, that is twelve clips a second,
which is either fine or fatal depending on the code beneath it. That is the
conversation the curve exists to start.

The two dashed lines are the same expression, 1 − (1 − e^{−γ})^n, with n = N and
with n = 2.8 N. The first is derived: independent exponential samples, maximum
of N. The second is a FIT — the oversampled samples are correlated, no closed
form is known, and 2.8 is a number someone measured. Say which is which. A
model the room cannot tell apart from a curve fit has taught it the wrong thing
about what a model is.

The measurement stops at 1/M because M symbols cannot express a rarer event
than one in M. Take M up to 3000 and the curve extends; it does not become
smoother where it already was.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
