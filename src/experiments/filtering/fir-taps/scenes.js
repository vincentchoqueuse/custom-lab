// Lecture script — auto-discovered by the registry.
// Each scene IS a classic FIR, typed as coefficients: the URL carries them
// (?b=0.25,0.25,0.25,0.25), so any variation a student invents is a link.
export default [
  {
    id: 'through',
    title: 'The signal goes in, the signal comes out',
    view: 'response',
    params: { b: [0.25, 0.25, 0.25, 0.25], source: 'square', f0: 125 },
    visible: ['source', 'f0'],
    notes: `Starting with what the filter does, before how it does it: a square
wave goes in, in orange, and something rounder comes out, in blue. Four
coefficients equal to 1/4, and nothing else.

The question to ask before changing tab: what disappeared? The corners — that
is, the high harmonics. The next tabs answer it twice over, first with the
coefficients and then with the spectrum.

Changing source or f₀ moves the output and leaves the filter alone.`,
  },
  {
    id: 'moving-average',
    title: 'The moving average',
    view: 'gain',
    params: { b: [0.25, 0.25, 0.25, 0.25], source: 'square', f0: 125 },
    visible: ['b'],
    notes: `Four coefficients equal to 1/4: the most naive filter in the world,
and it has PERFECT zeros at k·Fs/L = 2, 4 and 6 kHz, which the harness verifies
to 1e-15. Typing 0.125 eight times tightens the zeros and lowers the cutoff.

Why 1/L and not 1 is worth asking: H(0) = Σb is the DC gain, shown in the
statline, and it has to be 1.`,
  },
  {
    id: 'delay',
    title: 'The pure delay',
    view: 'response',
    params: { b: [0, 0, 0, 1], source: 'square', f0: 125 },
    visible: ['b'],
    notes: `With b = 0,0,0,1 the filter does nothing except wait. The output is
the input shifted by three samples, bit for bit, and the harness checks it.

The frequency tab reads |H| = 1 everywhere — an all-pass. The moral is that the
magnitude does not tell the whole story: the phase exists. Adding zeros in front
lengthens the wait.`,
  },
  {
    id: 'difference',
    title: 'The differentiator',
    view: 'gain',
    params: { b: [1, -1], source: 'saw', f0: 125 },
    visible: ['b'],
    notes: `With b = 1,−1 the filter is the difference of two samples. Σb = 0, so
DC is ANNIHILATED, and |H(f)| = 2·|sin(πf/Fs)| rises with frequency: a high-pass
that amplifies noise at 6 dB per octave.

Freezing and trying 1,0,−1 — the centred derivative — kills DC in the same way
but adds a zero at Fs/2 as well.`,
  },
  {
    id: 'design',
    title: 'Building a band-pass by hand',
    view: 'gain',
    params: { b: [0.5, 0, -0.5], source: 'square', f0: 125 },
    visible: ['b', 'f0'],
    notes: `With 0.5,0,−0.5 there are zeros at DC AND at Fs/2, with a hump in
between: a band-pass in three coefficients.

Having the room propose coefficient sets and testing them live works well, and
the URL carries them, so every attempt is a shareable link. Comparing with the
FIR-by-windowing experiment closes the loop: the systematic method does in one
formula what is being groped for by hand here.`,
  },
];
