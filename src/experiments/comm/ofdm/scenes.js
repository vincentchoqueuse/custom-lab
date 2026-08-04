// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'selective',
    title: 'Scene 1 · The channel digs holes',
    params: { Nc: 64, L: 6, cp: 8, snr: 15, M: 50 },
    visible: ['L'],
    notes: `Six paths, and the channel spectrum becomes a landscape of ridges and
FADES at −20 or −30 dB. Pressing R gives another channel every time, always with
holes.

The question to ask: what can a carrier at the bottom of a hole transmit?
Nothing, and no equalizer will get it out. Dropping L to 1 flattens the channel
again — the selectivity comes from the ECHOES.`,
  },
  {
    id: 'one-tap',
    title: 'Scene 2 · The miracle of the FFT',
    view: 'constellation',
    params: { Nc: 64, L: 6, cp: 8, snr: 20, M: 50 },
    visible: ['snr', 'L'],
    notes: `Before equalization, in purple, the cloud is twisted: each carrier
rotated and compressed by ITS own H_k. After, in blue, ONE division per carrier
— a single coefficient — and the QPSK reappears.

That is the central theorem: with the prefix in place the convolution becomes
circular, and the FFT DIAGONALIZES the channel. The sixty-tap equalizer of the
single-carrier system has become 64 divisions.`,
  },
  {
    id: 'prefix',
    title: 'Scene 3 · Sabotaging the prefix',
    view: 'constellation',
    params: { Nc: 64, L: 6, cp: 8, snr: 25, M: 50, seed: 5 },
    visible: ['cp'],
    notes: `At 25 dB everything is clean. Freezing and then taking L_cp from 8
down to 0 lets points escape WHILE the noise has not moved: the ISI of the
previous symbol leaks into the FFT window, and zero-forcing equalization
AMPLIFIES it on the faded carriers — the statline shows a BER around 1.7 %, with
one carrier near 40 %.

Raising the SNR to 30 changes nothing: that is an error floor. Pressing R shows
the severity depending on the channel drawn, since ISI kills through the fades.
The parameters drawer reads "prefix long enough? NO". The samples "wasted" on
the prefix are the price of the diagonalization.`,
  },
  {
    id: 'fades',
    title: 'Scene 4 · The errors live in the holes',
    view: 'ber',
    params: { Nc: 64, L: 6, cp: 8, snr: 12, M: 200 },
    visible: ['snr', 'M'],
    notes: `The BER carrier by carrier, as points, over the zero-forcing theory
Q(√(|H_k|²·SNR)) in orange. Putting it side by side with the channel tab shows
the error peaks landing EXACTLY on the fades.

Which is why OFDM never lives alone: interleaving plus coding — see the Hamming
and soft-decoding experiments — spread the information across good and bad
carriers alike.`,
  },
];
