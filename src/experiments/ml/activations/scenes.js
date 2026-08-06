// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'shape',
    title: 'The curve, and its derivative',
    view: 'transfer',
    params: { act: 'relu', signal: 'sine', gain: 1, bias: 0 },
    visible: ['act', 'bias'],
    notes: `Going through the six activations in order, there are TWO curves to
watch rather than one: σ in blue and σ′ in orange.

  identity   σ′ = 1 everywhere — which is precisely the problem, see scene 4
  ReLU       σ′ is 1 or 0, with nothing in between
  leaky      the 0 becomes 0.01, so a dead neuron can come back
  tanh       σ′(0) = 1, then collapses
  sigmoid    σ′(0) = 0.25 AT BEST, 1.8·10⁻² at x = 4, 3.4·10⁻⁴ at x = 8

The statline carries the number, and it is worth being careful about what is
claimed from it: one saturated stage does not divide the gradient by a
thousand, it divides it by 57 at x = 4. What kills a deep network is the
STACKING — ten layers at their very best multiply the gradient by
0.25¹⁰ = 10⁻⁶. The vanishing gradient is therefore nothing mysterious; it is
repeated multiplication, and ReLU replaces the factor by 1.

Moving the bias slides the curve. That is all a bias does, and it is already a
great deal: it chooses WHERE in the curve the signal works.

The "Derivatives compared" tab puts the five σ′ on one figure, which is where
an activation is actually chosen. Clicking legend chips off one at a time
allows pairwise comparison. Only one of them dips below zero, GELU, whose
derivative reaches −0.13 — it is not monotone, which surprises and deserves
saying out loud.`,
  },
  {
    id: 'harmonics',
    title: 'A nonlinearity creates frequencies',
    view: 'spectrum',
    params: { act: 'relu', signal: 'sine', gain: 1, bias: 0 },
    visible: ['act', 'gain'],
    notes: `A 16 Hz sinusoid goes in. Out of the ReLU comes a DC line, the
fundamental, and a comb at 32, 64 and 96 Hz that nobody put there.

This is plain half-wave rectification, and its Fourier series has been known
since 1822: DC = A/π, fundamental = A/2, harmonic 2k = 2A/(π(4k²−1)). The
harness verifies that the measured lines land on those values to 1e-12, so this
is the formula rather than an illustration of it.

Switching to tanh is worth predicting first: the even harmonics disappear.
The reason is parity — tanh is an odd function, and an odd function of a
sinusoid can only contain odd harmonics. The parity of the function is legible
directly in the spectrum.

Ending on the identity closes the argument: the output spectrum is the input
spectrum, line for line. A linear layer invents nothing.`,
  },
  {
    id: 'imd',
    title: 'Two tones, and the line that cannot be filtered',
    view: 'spectrum',
    params: { act: 'tanh', signal: 'two', gain: 2, bias: 0 },
    visible: ['gain', 'act'],
    notes: `Two tones, at 16 and 21 Hz. The output holds far more than their
harmonics: it holds SUMS and DIFFERENCES, and the awkward one is
2f₁ − f₂ = 11 Hz, which the statline measures.

Why it is awkward is the point of the scene. The harmonics are far away and a
low-pass filter removes them. This line sits BETWEEN the two tones, inside the
useful band, and no filter takes it out without taking the signal with it.

That is the plague of amplifiers, converters and RF stages, and it is also what
a neural network does deliberately at every layer: mixing frequencies to
manufacture new ones.

Raising g makes the line climb three times faster than the signal, in dB.
Measured: from g = 0.05 to 0.1 the fundamental rises by 1 in log₂ and the
intermodulation by 2.99, so the three-for-one law is exact — IN SMALL SIGNAL.
Pushing to g = 0.4 → 0.8 drops the slope to 2.41, because the cubic regime has
closed and tanh is compressing. Both halves belong in the lecture: an
asymptotic law without its domain of validity is a half-truth, and it is
exactly the half that gets applied outside the domain.`,
  },
  {
    id: 'why',
    title: 'Why one is needed at all',
    view: 'time',
    params: { act: 'identity', signal: 'square', gain: 1, bias: 0 },
    visible: ['act', 'bias'],
    notes: `With the identity activation the output IS the input, and so is the
spectrum.

The question that opens the next experiment: if every activation were the
identity, what would a ten-layer network compute?

The product of ten matrices, which is to say one matrix. Ten linear layers have
exactly the expressive power of one, so depth buys nothing whatsoever. The
expressive-power experiment demonstrates it on screen, and it is the reason
this whole file exists.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
