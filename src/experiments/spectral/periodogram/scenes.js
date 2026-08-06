// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3-4 · problem 5 · method 6 · wall 7
// The last scene hands the record over to "High-resolution methods" unchanged:
// same 200 Hz, same 2 Hz gap, same 25 dB, same 256 samples (RUNNING THREAD).
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'one-line',
    title: 'One line, and no argument about where it is',
    view: 'spectrum',
    params: { method: 'raw', N: 512, L: 256, win: 'rect', snr: 40, a2: -20, df: 40 },
    visible: ['snr', 'N'],
    notes: `At 40 dB the periodogram does exactly what the textbook promises:
two clean peaks, at the right frequencies, well above everything else. There is
no estimation problem visible, and that is the point of opening here.

Establish the two rulers while they are easy to read. The width of a peak is
Fs/N — take N from 512 to 128 and watch it get four times wider. And the height
of a peak is the power of the line; the second one is 20 dB down, and it looks
20 dB down.

Now take the SNR from 40 to 10. The floor rises to meet the lines, and the
question the whole experiment answers appears: that floor is not smooth. It is
grass, and it does not calm down.

Ask the room what to do about it before moving on. The instinctive answer —
"take a longer record" — is the wrong one, and it is worth having on the table
before scene 2 shows why.`,
  },

  {
    id: 'noise-floor',
    title: 'The noise floor that never comes down',
    // the SPECTRAL figure, which is what these notes describe and what the
    // subject is about; the record itself is one tab to the left, for the room
    // that wants to see what was measured before seeing what was estimated
    view: 'spectrum',
    params: { method: 'raw', N: 512, L: 256, win: 'rect', snr: 10, a2: -20, df: 40 },
    visible: ['N', 'snr'],
    notes: `The raw periodogram of a noisy signal. The strong line comes out, the
weak one too, and between them sits the noise floor, some 15 dB of it. The time
tab, one to the left, holds the record it came from — worth thirty seconds if
the room has not yet accepted that nothing in that trace announces two lines.

The question belongs before any dial is touched: if the record length is
multiplied by sixteen, does the noise floor come down? The room answers yes — more
data, less noise. Freezing and then taking N from 512 to 8192 settles it.

The floor does not move by a decibel. There are sixteen times more points, all
of them just as noisy, and the statline confirms it: the σ/mean fluctuation
stays pinned at 1.

That is the result of the chapter: the periodogram is not consistent. Each
point follows a χ² law with two degrees of freedom, whose standard deviation
equals its mean, and that does not depend on N. A longer record buys
RESOLUTION, never variance.`,
  },
  {
    id: 'cutting',
    title: 'Where the samples go',
    view: 'segments',
    params: { method: 'bartlett', N: 4096, L: 256, win: 'rect', snr: 10, a2: -20, df: 40 },
    visible: ['method', 'win'],
    notes: `Before discussing variance it is worth looking at the segmentation.
In blue, the windows where they fall; in orange, THEIR SUM — the total weight
each sample receives in the estimate.

Four cases, in this order, reading the orange curve out loud:

  1. Bartlett with a rectangular window gives a flat sum at 1. Every sample
     counts once. Nothing lost, nothing counted twice.
  2. Bartlett with Hann makes the sum RIPPLE and fall to zero between
     segments. The samples at each segment edge are simply discarded, and the
     question to put to the room is where those measurements went.
  3. Welch with Hann is flat at 1 again. The overlap puts back exactly the
     weight the window removed — that is the COLA condition, verified to 1e-12
     by the harness, and it is how the information comes back.
  4. Welch with a rectangular window is flat at 2. Every sample is counted
     TWICE with no attenuation at all: neighbouring segments share half their
     raw data, so they are correlated, which is exactly why this setting loses
     20 % of the expected variance reduction.

This view alone justifies the Welch window. Everything that follows only
measures it.`,
  },
  {
    id: 'welch',
    title: 'Averaging, and paying in resolution',
    view: 'spectrum',
    params: { method: 'welch', N: 2048, L: 256, win: 'hann', snr: 10, a2: -20, df: 40 },
    visible: ['method', 'L'],
    notes: `The same data, read differently. Welch cuts the record into
overlapping segments, windows each one, and averages the periodograms. The
floor settles: σ/mean falls toward 1/√K, and K is in the statline.

The price appears when L slides from 1024 down to 64. A large L gives few
segments and a sharp but still noisy spectrum; a small L gives many segments
and a smooth spectrum with broadened lines. The product does not improve — the
information is only being moved. It is the same trade as windowing, seen from
the VARIANCE side rather than the resolution side.

Comparing Bartlett and Welch at equal L shows Welch getting nearly twice as
many segments from the same data.

And the question that gives the window its meaning: switch Welch from Hann to
rectangular at equal L, and the gain evaporates. Two segments overlapping by
50 % share half their samples; without attenuation at the edges they are
strongly correlated, and averaging correlated things does not divide the
variance by their number. Measured by the harness: Welch with Hann meets the
law at 1.0, Welch with a rectangular window misses it by 20 %. The overlap only
pays with a window that fades at the edges, which is that window's reason for
existing rather than a detail.`,
  },
  {
    id: 'buried',
    title: 'Two ways to lose a line',
    view: 'spectrum',
    params: { method: 'welch', N: 4096, L: 512, win: 'rect', snr: 10, a2: -35, df: 12 },
    visible: ['win', 'a2', 'df'],
    notes: `The weak green line is at −35 dB and 12 Hz from the strong one, and
it is invisible. Why is the useful question, and the room should name the two
causes separately before either is treated.

It may be under the GRASS, which is variance, and the remedy is averaging:
lowering L brings the floor down. Or it may be under the LOBES of its
neighbour, which is leakage, and no amount of averaging will help — switching
the window from rectangular to Hann and then Blackman brings it out at once.

The diagnosis is the skill. Averaging a leakage problem achieves nothing, and
so does changing window for a variance problem.`,
  },
  {
    id: 'law',
    title: 'The −1/2 slope',
    view: 'consistency',
    params: { method: 'welch', N: 4096, L: 256, win: 'hann', snr: 10, a2: -20, df: 40 },
    visible: ['method', 'N'],
    notes: `The same measurement repeated for shorter and shorter segments, on
log–log axes. The blue curve is the measured fluctuation, the dashed one is
1/√K, and they lie on each other over two decades.

Worth pointing out: the leftmost point, at K = 1, IS the raw periodogram of
scene 1. It is not a separate method but the degenerate case of this one, where
nothing is averaged.

Switching between Bartlett and Welch against the dashed line is instructive:
Bartlett sits on 1/√K, Welch slightly ABOVE it. That is not a measurement
defect — 1/√K is the law for INDEPENDENT segments, and Welch's share half their
samples. What Welch gains is not beating the law but reaching a K twice as
large at equal segment length, and therefore at equal resolution.`,
  },
  {
    id: 'handover',
    title: 'Two lines that will not come apart',
    view: 'spectrum',
    params: { method: 'raw', N: 256, L: 128, win: 'rect', snr: 25, a2: 0, df: 2 },
    visible: ['df', 'N'],
    notes: `THE END OF THE ROAD for this estimator, and the scene the next two
experiments start from. Set it up out loud, because the numbers are about to be
handed over unchanged: two equal lines around 200 Hz, 2 Hz apart, 25 dB, 256
samples at Fs = 1 kHz.

One lump. Not two peaks close together — one. And the drawer says why in one
line: the Fourier limit Fs/N is 3.9 Hz and the gap is 2, so the requested
separation is 0.51× the limit. Below one, the window's own lobe is wider than
the distance between the lines, and no amount of care in computing the
periodogram changes that.

Now let the room try the two repairs that feel obvious, and watch both fail.
Raise N — that works, and it is worth showing, but it costs record length you
may not have: at N = 1024 the limit is 0.98 Hz and the pair separates. Then put
N back to 256 and raise the SNR to 40. NOTHING happens. That is the important
one: this is not a noise problem. The lines are perfectly visible and still
merged, because the limit is set by the OBSERVATION TIME and by nothing else.

That is the wall, and it is where this experiment stops. The next one takes
exactly this record — same 200 Hz, same 2 Hz, same 25 dB, same 256 samples —
and separates the two lines anyway. It does it by assuming something we have
not assumed here, and the whole of "High-resolution methods" is the price of
that assumption.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
