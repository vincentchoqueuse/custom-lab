// Lecture script. Auto-discovered by the registry.
const BASE = { key: '5', ms: 40, snrDb: 10, M: 400, seed: 34 };

export default [
  {
    id: 'two-tones',
    title: 'A key is two sinusoids',
    view: 'time',
    params: { ...BASE, snrDb: 10 },
    visible: ['key', 'snrDb'],
    notes: `The orange trace is what a telephone sends when a key is pressed:
two sinusoids added, one from the low group and one from the high. Nothing
else — no code, no framing, no clock. The grey trace is the same signal after a
line that has been in the ground since 1970.

Change the key and watch the waveform change without becoming readable. That is
the point of the scene: the beat pattern is different for each key and no eye
will ever tell 5 from 8 off this figure. The information is there, and it is not
in the time domain.

Take the SNR down to −10 dB. Now nothing at all is visible, and the receiver
that still reads the key correctly is on the next tab.

Worth naming while the waveform is up: the two frequencies were chosen so that
no one is a harmonic or a sum of the others — 697, 770, 852, 941 against 1209,
1336, 1477, 1633. A voice on the line produces harmonics; those pairs were
picked so that a voice does not accidentally spell a digit.`,
  },
  {
    id: 'projections',
    title: 'Eight projections, and the floor',
    view: 'amplitudes',
    params: { ...BASE, snrDb: 5 },
    visible: ['snrDb', 'ms'],
    notes: `Eight stems, one per DTMF tone: the least-squares amplitude of that
tone in the received window. Two of them stand up, and the two yellow dots say
those are exactly the two that were sent.

The estimator is a PROJECTION and nothing else. For each tone the receiver
projects the window onto the two-dimensional space spanned by its cosine and
its sine, and takes the modulus of the coefficient. That is the matched filter
of two experiments ago, written for a signal whose phase is unknown — the phase
is exactly what the two-dimensional projection maximises out.

The orange line is the number the design turns on: E|â| = σ√(π/N), the average
amplitude the projection returns for a tone that is NOT THERE. It is not zero,
it is noise projected onto two directions, and it falls as 1/√N.

That gives the whole design rule in one gesture. Take T from 40 ms down to 5:
the two stems stay where they are and the floor climbs to meet them. Take it up
to 100 and the floor sinks. The statline reports the margin in decibels, and a
DTMF receiver is specified at about 40 ms because that is where the margin
survives a bad line and a key pressed quickly.`,
  },
  {
    id: 'keypad',
    title: 'Sixteen scores, one decision',
    view: 'keypad',
    params: { ...BASE, snrDb: 0 },
    visible: ['snrDb', 'key'],
    notes: `The last step, and it is M-ary detection: each key scores the sum of
the energies of its two tones, and the receiver takes the largest of sixteen.

The yellow circle marks the key that was sent, the orange outline the key that
was decided. When they coincide there is nothing to say; the scene is worth
playing until they do not.

Take the SNR down a decibel at a time and watch the grid go from one bright
cell to a bright ROW and a bright COLUMN — which is the useful failure to see.
A wrong decision here is almost never random: it is a neighbour in the same row
or the same column, because one of the two tones was recovered and the other
was not. Sixteen keys, but the errors live on two axes of four.

Then press R a dozen times at a fixed SNR and count. The statline gives the
measured rate over M bursts, and it is the number a specification is written
against.`,
  },
  {
    id: 'laws',
    title: 'Rayleigh against Rice',
    view: 'laws',
    params: { ...BASE, snrDb: 3, M: 800 },
    visible: ['snrDb', 'ms'],
    notes: `Why any of this works, and it is the same statement as the GLRT
experiment two doors down.

The projection returns two coefficients, each of them white noise projected
onto a unit direction, so each is Gaussian of variance 2σ²/N. The modulus of
that pair is therefore RAYLEIGH when the tone is absent — the grey histogram,
with its closed form on top — and RICE when it is present, the blue one. Both
laws are drawn from their formulas and neither is fitted.

The decision is a threshold between two densities, and everything the receiver
can do is move them apart. The SNR moves the Rice; the window length moves BOTH,
because their common scale is σ√(2/N). Take T from 40 down to 10 and watch them
slide into each other; take it to 100 and watch them separate.

The one thing to leave the room with: |â|² is a χ′² with two degrees of freedom
— non-central when the tone is there, central when it is not — which is exactly
the GLRT statistic of an unknown amplitude and an unknown phase. The telephone
keypad of 1963 is a generalised likelihood ratio test, built before the name
was common, because it is what falls out when you do not know the phase.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
