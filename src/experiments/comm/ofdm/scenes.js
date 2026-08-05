// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'prefix-object',
    title: 'The frame, and the prefix at its head',
    params: { Nc: 64, L: 6, cp: 8, snr: 25, M: 50 },
    visible: ['cp'],
    notes: `The transmitted signal in time, before the channel. On its own it is
one continuous stretch of noise — which is what an OFDM signal looks like, and
why the structure has to be drawn rather than described.

The black verticals cut it into FRAMES. Each frame is L_cp + N samples, and the
orange band at its head is the cyclic prefix. The N samples after it are the
useful block: the IFFT of the sixty-four QPSK symbols.

Two things to say while moving L_cp. The prefix carries no information at all —
it is the last L_cp samples of the block copied to its front, and the harness
checks that copy is bit for bit. And the receiver throws it away, so the rate
paid is L_cp out of L_cp + N: at 8 and 64, eleven per cent of the link, spent on
samples nobody reads.

The next tab is what those eleven per cent buy.`,
  },
  {
    id: 'absorb',
    title: 'The prefix absorbs the channel',
    view: 'window',
    params: { Nc: 64, L: 6, cp: 8, snr: 25, M: 50, seed: 5 },
    visible: ['cp', 'L'],
    notes: `The same frames, now received — and one line has been added, the
green dashed one. The channel has memory: after each frame boundary, its first
L−1 samples are still a mixture with the PREVIOUS frame. The green line is where
that mixture ends.

The whole of OFDM's timing is the comparison between that green line and the
right edge of the orange. The receiver drops the prefix and transforms
everything after it, so:

  green INSIDE the orange  → the FFT window sees only this frame
  green BEYOND the orange  → the window is contaminated, and that is ISI

At L_cp = 8 with L = 6 the green sits at sample 5 and the orange ends at 8 — it
fits, with three samples to spare. Take L_cp down to 2 and the green jumps
outside: the statline counts the three samples that leak.

Ask for the prediction, then switch to the constellation. The points scatter,
and no SNR brings them back. Same gesture, two tabs: what is SEEN here in time
is what is MEASURED there in the plane. The prefix is long enough exactly when
the channel's memory fits inside it — a statement about a picture before it is
one about an inequality.`,
  },
  {
    id: 'selective',
    title: 'The channel digs holes',
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
    title: 'The miracle of the FFT',
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
    title: 'Sabotaging the prefix',
    view: 'constellation',
    params: { Nc: 64, L: 6, cp: 8, snr: 25, M: 50, seed: 5 },
    visible: ['cp', 'snr'],
    notes: `The consequence of the previous scene, measured. At 25 dB everything
is clean; freeze, then take L_cp from 8 down to 0 and let points escape WHILE the
noise has not moved. The ISI of the previous symbol leaks into the FFT window,
and zero-forcing AMPLIFIES it on the faded carriers — a BER around 1.7 %, with
one carrier near 40 %.

Raising the SNR to 30 changes nothing: that is an error floor, and the
distinction is worth insisting on. Noise is beaten with power; interference is
not beaten at all, only avoided — which is what the prefix does.

Pressing R shows the severity depending on the channel drawn, since ISI kills
through the fades. The samples spent on the prefix are the price of the
diagonalization.`,
  },
  {
    id: 'fades',
    title: 'The errors live in the holes',
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
