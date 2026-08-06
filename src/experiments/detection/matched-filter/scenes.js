// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'plain',
    title: 'A pulse you can simply see',
    view: 'signals',
    params: { shape: 'rect', N: 32, snr: 3, tau: 32, M: 800 },
    visible: ['snr', 'shape'],
    notes: `Start where there is no problem at all. One pulse, thirty-two
samples wide, sitting at τ = 32 in mild noise. Anyone in the room can point at
it, and the correlator tab is a formality.

Two things to establish while it is easy, because they are what the rest of the
experiment is about. First, the pulse SHAPE — switch between rectangle, triangle
and the raised cosine and watch the peak of the correlation change shape with
it: the matched filter is matched to something, and this is that something.
Second, the pulse is known EXACTLY — its shape, its width, its amplitude. Only
its position is not.

Now take the SNR down one notch at a time and stop the moment the room stops
being able to point at it. That is where the next scene begins, and it is worth
letting them find it themselves rather than being shown it.`,
  },

  {
    id: 'invisible',
    title: 'Where is the pulse?',
    view: 'signals',
    params: { shape: 'rect', N: 32, snr: 0.1, tau: 32, M: 800 },
    visible: ['snr', 'N'],
    notes: `At an SNR of 0.1 per sample, which is −10 dB, the orange pulse is
buried in r[n]. Letting the room hunt for it is worth the twenty seconds it
takes, because nobody finds it, and pressing R changes nothing about that.

The question that opens the chapter is whether the information is therefore
lost. It is not: the shape being looked for is known, and that knowledge has
not been used yet. The next view uses it.`,
  },
  {
    id: 'peak',
    title: 'The peak rises out of the noise',
    params: { shape: 'rect', N: 32, snr: 0.1, tau: 32, M: 800 },
    view: 'correlator',
    visible: ['snr', 'tau'],
    notes: `Same signal and same noise, now correlated with the known shape. The
peak sits at τ, with the purple estimate on the yellow line. Pressing R changes
the output noise and leaves the peak; moving τ makes the peak follow.

The mechanism is worth stating in one sentence: the correlator concentrates the
whole energy of the pulse, N·SNR, onto a single lag, while the noise only adds
up as √N. Lowering the SNR until the peak is lost, around 0.02, shows that the
limit is real — but it lies some 15 dB below what the eye could do.`,
  },
  {
    id: 'gain',
    title: '+3 dB per doubling',
    params: { shape: 'rect', N: 32, snr: 0.2, tau: 32, M: 2000 },
    view: 'processing',
    visible: ['N', 'shape'],
    notes: `The output SNR is N times the input SNR, so every doubling of N buys
3 dB — a straight line on a logarithmic N axis, confirmed by the Monte Carlo
points.

Changing the pulse shape from rectangular to half-sine to Gaussian moves
nothing at all. At equal energy the shape is irrelevant: the matched filter
exploits the energy and the fact that the shape is known, never the shape
itself. This is radar, GPS, and the reason spreading codes are long.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
