// Auto-discovered by the registry. Defaults: view = first view, drawer = false.
export default [
  {
    id: 'shapes',
    title: 'The seven signals, in time',
    params: { signal: 'rect', T: 5, t0: 0 },
    view: 'time',
    visible: ['signal', 'T', 't0'],
    notes: `Going through the catalogue before mentioning spectra at all, and
having the room sort the shapes out loud, produces three families: those that
stop (gate, triangle), those that decay without ever reaching zero (Gaussian,
exponentials), and the one that lingers (sinc).

The question to ask before opening the spectrum tab is which of them has the
narrowest spectrum. T sets the duration of all of them, and the duration–width
relation is the whole point of the experiment.`,
  },
  {
    id: 'gate',
    title: 'The gate and the cardinal sine',
    params: { signal: 'rect', T: 5, t0: 0 },
    view: 'spectrum',
    visible: ['T', 't0'],
    notes: `The basic pair of the course. The first zero sits at 1/T, a value
worth reading in the statline and then locating on the axis.

Before moving T, it is worth asking what doubling the gate duration does to the
lobe width. The expected wrong answer is that it doubles. It is halved.`,
  },
  {
    id: 'scaling',
    title: 'Compress in time, spread in frequency',
    params: { signal: 'rect', T: 15, t0: 0 },
    view: 'spectrum',
    visible: ['T', 't0'],
    lock: true,
    notes: `The axes arrive pinned, so the frame will not move and only the curve
will. Freezing at T = 15 ms and coming down to 2 ms opens the lobe in front of
the room while the grey ghost stays narrow.

The displayed product T·B₃ does not change by a digit. That is the scaling
theorem rather than a coincidence, and the ghost is what makes it a
demonstration.`,
  },
  {
    id: 'gauss',
    title: 'The Gaussian, a fixed point of Fourier',
    params: { signal: 'gauss', T: 5, t0: 0 },
    view: 'spectrum',
    visible: ['signal', 'T', 't0'],
    notes: `Moving from the gate to the Gaussian and comparing the signal and
spectrum tabs shows the same shape on both sides — no sidelobes and no zeros,
the only signal in the catalogue for which that is true.

The dB tab then separates them sharply: the Gaussian plunges, the gate
lingers.`,
  },
  {
    id: 'delay',
    title: 'A delay is only visible in the phase',
    params: { signal: 'rect', T: 5, t0: 0 },
    view: 'phase',
    visible: ['t0'],
    notes: `Moving t₀ while watching the spectrum tab changes |X(f)| by not one
pixel, which the numerical harness verifies as an exact identity.

The phase tab is where the delay went: a slope of −2πt₀, steeper the longer the
delay, with the sawtooth pattern coming from the wrap at ±π. The moral is worth
stating — a magnitude spectrum alone cannot say WHEN.`,
  },
  {
    id: 'sidelobes',
    title: 'Sidelobes, in dB',
    params: { signal: 'rect', T: 5, t0: 0 },
    view: 'db',
    visible: ['signal', 't0'],
    notes: `Alternating gate and triangle gives −13.3 dB against −26.5 dB,
exactly twice as many decibels because the triangle's transform is the sinc
squared.

That is already the whole idea of windowing: softening the edges crushes the
sidelobes. The spectral-windowing experiment takes it from here.`,
  },
  {
    id: 'rf',
    title: 'Modulating is shifting the spectrum',
    params: { signal: 'rf', T: 5, f0: 600, t0: 0 },
    view: 'spectrum',
    visible: ['f0', 'T', 't0'],
    notes: `The same gate multiplied by a cosine: the lobe has moved to ±f₀, half
as tall, with the same width 2/T.

Moving f₀ translates the pattern without deforming it; moving T changes the
width and not the position. Two parameters, two orthogonal effects — which is
the modulation theorem, seen rather than derived.`,
  },
];
