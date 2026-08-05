// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'noise-floor',
    title: 'The noise floor that never comes down',
    view: 'time',
    params: { method: 'raw', N: 512, L: 256, win: 'rect', snr: 10, a2: -20, df: 40 },
    visible: ['N', 'snr'],
    notes: `The raw periodogram of a noisy signal. The strong line comes out, the
weak one too, and between them sits the noise floor, some 15 dB of it.

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
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
