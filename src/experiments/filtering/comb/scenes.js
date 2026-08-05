// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'through',
    title: 'The signal goes in, the echoes come out',
    view: 'response',
    params: { structure: 'fb', D: 40, g: 0.9, source: 'square', f0: 110 },
    visible: ['D', 'g'],
    notes: `The simplest recursive filter there is: the output adds to itself,
delayed by D samples. An echo of the echo of the echo — hence IIR, since a
finite input gives an output that never quite stops.

Raising g toward 0.95 makes the tail last; changing D brings the repetitions
closer together.

The question to ask before switching to frequency: what does a simple echo look
like on a spectrum? The expected answer is that it changes nothing. The next two
tabs show a comb, with teeth at Fs/D.`,
  },
  {
    id: 'teeth',
    title: 'The echo makes a comb',
    view: 'gain',
    params: { structure: 'fb', D: 40, g: 0.9, source: 'square', f0: 110 },
    visible: ['D', 'g'],
    notes: `The spectrum becomes a comb: sharp RESONANCES at k·Fs/D = k·200 Hz,
reaching +20 dB at g = 0.9, with soft notches between them at −5.6 dB.

Changing D tightens the teeth — the spacing is Fs/D and nothing else. Changing g
sets the height of the resonances, 1/(1−g), which explodes as g approaches 1.
Two parameters, two orthogonal effects, and the most legible filter of the
course.

Switching to the simple echo keeps the same 200 Hz and swaps the roles: +5.6 dB
of teeth against −20 dB of notches. The recursive form notches little and
resonates hard; the non-recursive one does the opposite.`,
  },
  {
    id: 'echo',
    title: 'Two spikes, or infinitely many',
    view: 'impulse',
    params: { structure: 'fb', D: 40, g: 0.7, source: 'square', f0: 110 },
    visible: ['structure', 'g'],
    notes: `The impulse response of the recursive form is the geometric train
gᵏ: one spike every D samples, decaying without ever reaching zero — the harness
verifies h[kD] = gᵏ to machine precision. That is what an INFINITE impulse
response means.

Switching to the simple echo leaves TWO spikes. The whole difference between FIR
and IIR is in that toggle, and it is visible at a glance.

A teaser for later: pluck the recursive form with noise and you have a guitar
string (Karplus–Strong).`,
  },
  {
    id: 'align',
    title: 'Teeth on harmonics',
    view: 'gain',
    params: { structure: 'fb', D: 32, g: 0.8, source: 'square', f0: 250 },
    visible: ['D', 'g'],
    notes: `With f₀ = 250 Hz and Fs/D = 250 Hz, EVERY harmonic sits on a
resonance and the whole signal is lifted by 14 dB at once, as the statline
reports.

Freezing and moving D to 35 slides the harmonics into the notches and empties
the timbre — that is a flanger. The question that lands: why does the effect
depend on f₀ when the filter has not changed?`,
  },
  {
    id: 'sign',
    title: 'The complementary comb',
    view: 'gain',
    params: { structure: 'fb', D: 40, g: 0.9, source: 'saw', f0: 110 },
    visible: ['g'],
    notes: `Sliding g from +0.9 to −0.9 SWAPS resonances and notches: the
resonances now sit between the k·Fs/D, and DC is eaten — |H(0)| = 1/(1+|g|),
which is −5.6 dB.

The physics of an inverted echo is the same: at those frequencies the echo comes
back in antiphase. It is the phase shift that digs holes in the response of a
room near a reflecting wall.`,
  },
  {
    id: 'cost',
    title: 'Forty memories, two multiplications',
    view: 'structure',
    params: { structure: 'fb', D: 40, g: 0.9, source: 'square', f0: 110 },
    visible: ['structure', 'D', 'g'],
    notes: `The tab nobody asks for until they have to write the code. This is
the difference equation as a processor executes it: a chain of z⁻¹ — each one a
memory — with a gain on every tap and an adder collecting them.

The comb is the extreme case of the whole module, and the caption says it in
one line: forty memories, TWO multiplications. Every one of the thirty-nine
intermediate coefficients is zero, which is why nobody implements this as forty
multiply-accumulates and everybody implements it as a circular buffer with one
gain at its end. Compare with the FIR design tab, where forty-four memories
carry forty-three multiplications.

Then flip the structure to feed-forward. The taps move from the LEFT bus to the
RIGHT one — the loop is gone, and with it the echo that never stops. Same
delays, same one gain, and an entirely different filter: the loop is the whole
difference between FIR and IIR, and here it is a single wire.`,
  },
];
