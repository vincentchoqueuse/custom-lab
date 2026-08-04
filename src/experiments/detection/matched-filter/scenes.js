// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'invisible',
    title: 'Where is the pulse?',
    params: { shape: 'rect', N: 32, snr: 0.1, tau: 32, M: 800 },
    visible: ['snr'],
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
