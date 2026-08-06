// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'samples',
    title: 'What we have: samples',
    params: { stage: 'samples', L: 4, f0: 1000, half: 8 },
    visible: ['stage', 'f0'],
    notes: `A 1 kHz sinusoid sampled at 8 kHz, and nothing else so far: numbers,
one every 0.125 ms.

The spectrum stops at Fs/2 = 4 kHz, and that is not an omission — of a signal
clocked at 8 kHz, nothing whatsoever is known above 4 kHz. That is the whole
useful band.

The question to ask before going further: the same signal is wanted at four
times the rate, so what has to be computed? The room will suggest interpolating,
repeating, averaging. The answer takes two steps, and the first one computes
nothing at all.`,
  },
  {
    id: 'stuffing',
    title: 'Zeros — and the spectrum does not move',
    params: { stage: 'stuffed', L: 4, f0: 1000, half: 8 },
    visible: ['L', 'stage'],
    notes: `The first step inserts L−1 ZEROS between the samples. No arithmetic,
no information added. The time view shows a caterpillar of spikes separated by
nothing.

The spectrum is the moment of the session, and it is worth predicting first:
what do zeros do to a spectrum?

Nothing. X_up(f) = X(f) exactly, which the harness verifies to 1e-12. What
changed is the BAND: the view now reaches L·Fs/2 = 16 kHz instead of 4. The
spectral copies, which had always existed at k·Fs ± f₀, were off-screen and are
now inside it. They are called images, and there are exactly L−1 new ones.

One detail that matters: only one sample in L is non-zero, so the average power
has been divided by L. The filter will have to give it back.`,
  },
  {
    id: 'filter',
    title: 'The filter erases the images',
    params: { stage: 'filtered', L: 4, f0: 1000, half: 8 },
    visible: ['stage', 'L'],
    notes: `The second step is a low-pass with cutoff Fs/2 and gain L. Its
response is drawn in orange over the spectrum, so what it keeps and what it cuts
is visible rather than described.

The images fall by 62 dB, as the statline reports, and the time view fills in:
the zeros have become a sinusoid.

Two points deserve remarking on, neither of them obvious:

  · the interpolated curve passes EXACTLY through the original samples — 8e-18
    in the statline. That is not a coincidence but a property of the kernel,
    which is 1 at the center and 0 at every other multiple of L. The data were
    not approximated, they were kept.

  · the useful line came back up by 12 dB, which is 20·log10(L). That is the
    power the stuffing had divided by L and the filter gain returns. These two
    numbers are the same fact seen twice.

Going back and forth between stage 2 and stage 3 two or three times is worth
the time: the whole chain is in that alternation.`,
  },
  {
    id: 'short',
    title: 'A filter that is too short',
    params: { stage: 'filtered', L: 4, f0: 1000, half: 1 },
    visible: ['half', 'L'],
    notes: `At M = 1 the filter has nine coefficients and the image is at −7 dB —
still there, nearly untouched, and plainly visible on the figure. The filter
does not really exist.

Raising M improves it, but the claim needs care, because the measurement
contradicts the intuition: it is NOT monotone.

    M = 1  → −7 dB      M = 2  → −55 dB
    M = 4  → −44 dB     M = 8  → −62 dB      M = 16 → −80 dB

M = 4 is worse than M = 2. This is not a computational defect: the Hann window
sets a sidelobe floor, and the stop-band ripple pattern SLIDES as the length
changes, so the image falls sometimes into a notch and sometimes onto a lobe.
The trend is sound, each individual step is not.

It is a good moment to say something that is not said often enough: "longer,
therefore better" is true on average and false in particular, which is exactly
why one measures instead of reasoning.

The closing question: why not take M = 100? Because this filter runs at L·Fs,
so L times per input sample. Upsampling is not free; it is simply far cheaper
than an analog filter of the same steepness.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
