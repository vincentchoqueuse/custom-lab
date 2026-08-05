// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'samples',
    title: 'The signal and its samples',
    params: { signal: 'gauss', fe: 600, tau: 5 },
    view: 'time',
    visible: ['fe'],
    notes: `Starting with what is literally visible: a curve, and points taken
every Te = 1/Fe. Lowering Fe spreads the points out and leaves the curve alone.
At 600 Hz there are dozens per hump; at 100 Hz a handful.

The question to ask before moving to the next tab: what do those points know
about the signal? The whole experiment answers it, in frequency.`,
  },
  {
    id: 'copies',
    title: 'The spectrum repeats itself',
    params: { signal: 'gauss', fe: 600, tau: 5 },
    view: 'periodize',
    visible: ['fe'],
    notes: `A Gaussian sampled at 600 Hz. The spectrum of the sampled signal, in
blue, is not X(f): it is X(f) PLUS its copies shifted by ±Fe and ±2Fe, drawn in
grey. At 600 Hz they are far away and the central copy is untouched.

Asking what happens when Fe is lowered usually produces the wrong answer — that
the spectrum shrinks. It does not: the copies move closer.`,
  },
  {
    id: 'overlap',
    title: 'They overlap, and that is aliasing',
    params: { signal: 'gauss', fe: 150, tau: 5 },
    view: 'periodize',
    visible: ['fe', 'tau'],
    notes: `At Fe = 150 Hz the copies bite into the central one and ADD to it:
the blue hump is taller than the orange one, and the statline reports about
80 % in-band error. Aliasing is not a mysterious deformation, it is a sum.

Raising Fe slowly separates the copies until the error falls away. Widening τ
does the same thing from the other side — a signal more spread in time has a
narrower spectrum — which is the same trade seen twice.`,
  },
  {
    id: 'bandlimited',
    title: 'The only genuinely band-limited signal',
    params: { signal: 'sinc', fe: 300, tau: 5 },
    view: 'periodize',
    visible: ['fe', 'signal'],
    notes: `The sinc has a RECTANGULAR spectrum, stopping dead at 1/2τ = 100 Hz.
With Fe = 300 > 200 Hz the copies do not touch at all and the error is EXACTLY
zero, which the harness verifies. Below 200 Hz they overlap all at once.

This is Shannon's theorem shown rather than recited — and the sinc is the only
one of the four sources that achieves it, the others having infinite tails.`,
  },
  {
    id: 'dtft',
    title: 'What the samples know',
    params: { signal: 'triangle', fe: 250, tau: 5 },
    view: 'periodize',
    visible: ['signal', 'fe'],
    notes: `The green points are computed WITHOUT ever using X(f): they are the
transform of the samples themselves, Σ x(nTe)·e^{−j2πfnTe}. They land exactly
on the sum of the copies.

That is the Poisson summation formula, and it is the whole theorem in one
sentence: sampling in time is periodizing in frequency. Changing signal while
keeping Fe shows the demonstration surviving each time.`,
  },
];
