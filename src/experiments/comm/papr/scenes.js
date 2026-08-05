// Lecture script. Auto-discovered by the registry.
const BASE = { N: 64, L: 4, mod: 'qpsk', M: 600, seed: 34 };

export default [
  {
    id: 'between-the-samples',
    title: 'The peak is between the samples',
    view: 'envelope',
    params: { ...BASE },
    visible: ['L'],
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
    id: 'how-much',
    title: 'How much oversampling is enough',
    view: 'oversampling',
    params: { ...BASE },
    visible: ['N', 'mod'],
    notes: `The same measurement at L = 1, 2, 4, 8, 16, averaged over eighty
symbols so the curve is steady.

Ask for the shape before showing it. The usual guess is a straight climb; what
happens is a jump from 1 to 2, a smaller step to 4, and then nothing worth
plotting. The received wisdom — L = 4 is enough — is that flattening, and it is
worth having the room read the last two points and say the number themselves:
about a tenth of a decibel.

Why it flattens: the envelope is a band-limited signal, so between two samples
it cannot do anything sudden. Once the sampling is fine compared with its
fastest variation, more samples find nothing new. That is the sampling theorem
answering a question about maxima.

Change N and note that the curve shifts up but keeps its shape: the sampling
question and the how-many-carriers question are independent, which is why they
get a view each.`,
  },
  {
    id: 'grows-like-log',
    title: 'It grows like log N, not like N',
    view: 'growth',
    params: { ...BASE, N: 256 },
    visible: ['N', 'L'],
    notes: `Four curves, and the distance between them is the whole point.

The grey line is the WORST case: all N carriers in phase at one instant, giving
exactly N, or 10·log10(N) dB. It is the number an engineer reaches for when
asked to be safe. At N = 1024 it is 30.1 dB, which is a factor of a thousand in
power and an amplifier nobody would pay for.

The purple dashes are the model: the maximum of N independent exponentials has
mean H_N = 1 + 1/2 + … + 1/N, the harmonic number, exactly rather than
asymptotically. It grows like ln N. At N = 1024 it is 8.9 dB — three and a half
times smaller in decibels, a hundred and thirty times smaller in power.

The blue measurement sits between the purple and the orange, and where it sits
is decided by L. At L = 1 it lands on the purple, which is the model's own
regime. At L = 4 it lands on the orange, the 2.8 N fit. Move L in front of the
room and watch it change allegiance.

Then the question worth asking: why is the model so far below the worst case?
Because all N carriers aligning is one arrangement out of unimaginably many.
PAPR is a tail problem. Every serious answer to it — clipping, tone reservation,
selective mapping — is an answer about tails, and this curve is why.`,
  },
  {
    id: 'the-tail',
    title: 'What a designer actually buys',
    view: 'ccdf',
    params: { ...BASE, M: 2000 },
    visible: ['L', 'M'],
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
