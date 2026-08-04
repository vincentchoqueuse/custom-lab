// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'cut',
    title: 'Scene 1 · What the window throws away',
    params: { sig: 'sine', T: 40, win: 'rect', f0: 300 },
    view: 'time',
    visible: ['T'],
    notes: `The basic figure: the signal in grey, which continues; in blue what
is actually transformed; and a yellow line marking where the cut is made.

Moving T and having the room say what changes is worth the moment — the signal
does NOT change, only the observation does.

The question to ask before opening the spectrum tab: the sinusoid has a single
frequency, so will the spectrum of what was kept have a single line?`,
  },
  {
    id: 'lobe',
    title: 'Scene 2 · A line becomes a lobe of width 1/T',
    params: { sig: 'sine', T: 40, win: 'rect', f0: 300 },
    view: 'spectrum',
    visible: ['T'],
    lock: true,
    notes: `The answer is no. Cutting in time is multiplying by a window, and
therefore CONVOLVING the spectrum with the window's own. The line spreads over
roughly 1/T — the statline gives the −3 dB width and 1/T beside it.

The axes are pinned, so halving T doubles the lobe without the frame moving.
The displayed product T·B₃ stays at 0.886, which is the same constant as the
gate in the signal catalogue, seen from the other side.`,
  },
  {
    id: 'window',
    title: 'Scene 3 · The shape of the cut sets the skirts',
    params: { sig: 'sine', T: 40, win: 'rect', f0: 300 },
    view: 'spectrum',
    visible: ['win'],
    lock: true,
    notes: `At CONSTANT duration, moving from rectangular to Hann to Blackman
collapses the sidelobes — −13 dB, −31 dB, −58 dB — while the main lobe widens.
Dynamic range is only ever bought by paying in resolution.

There is no "best" window, only the question being asked. The spectral-
windowing experiment takes over for the case where two neighbouring lines must
be separated.`,
  },
  {
    id: 'law',
    title: 'Scene 4 · The 1/T law, measured',
    params: { sig: 'sine', T: 40, win: 'rect', f0: 300 },
    view: 'width',
    visible: ['T', 'win'],
    notes: `On log–log axes, a straight line of slope exactly −1. This is not a
fit: it is the width measured on the computed spectrum, for thirty durations.

Changing window translates the line upward without changing its slope — the
shape sets the constant, never the law. The yellow marker locates the current
duration, and moving it slides the point along the line.`,
  },
  {
    id: 'gabor',
    title: 'Scene 5 · The chirp: longer is no longer better',
    params: { sig: 'chirp', T: 20, win: 'hann', f0: 300, k: 2000 },
    view: 'width',
    visible: ['T', 'k'],
    notes: `The chirp sweeps k hertz per second. Observing longer sharpens the
resolution as 1/T but lets in a wider band as k·T, so the curve is no longer a
line but a V, and the bottom of the V is the best possible duration.

Both branches are worth reading out: the −1 slope of truncation on the left,
the +1 slope of the sweep on the right. The k·T² product in the drawer says
which regime one is in — very small on the left, very large on the right, of
order a few units at the bottom.

This is the Gabor trade-off measured rather than recited, and it is exactly the
window choice of the spectrogram. Moving k moves the bottom of the V.`,
  },
  {
    id: 'damped',
    title: 'Scene 6 · When the signal has already fallen silent',
    params: { sig: 'damped', T: 20, win: 'rect', f0: 300, tau: 15 },
    view: 'width',
    visible: ['T', 'tau'],
    notes: `With a damped sinusoid, as long as T < τ the signal is being cut and
the width follows 1/T. Beyond that the curve flattens: only silence is being
observed, and the line keeps the natural width 1/(πτ) the signal gave itself.

The moral is that lengthening the window improves resolution only while the
signal is still there. The burst source makes the same point more bluntly —
past the burst duration one is adding zeros, which interpolates the spectrum
without resolving anything.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
