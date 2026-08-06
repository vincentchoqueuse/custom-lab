// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2 · problem 3 · method 4 · problem 5-6
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'symbols',
    title: 'What went on each carrier, and what came back',
    view: 'symbols',
    params: { Nc: 64, L: 6, cp: 8, snr: 25, M: 50, k: 20 },
    visible: ['k', 'L'],
    notes: `Sixty-four carriers, each loaded with one QPSK symbol. Blue is what
the transmitter put on carrier k; orange is what the one-tap equalizer handed
back after the channel. The green point is the carrier the pill has selected,
and it is the same carrier the vertical marks two tabs along.

At L = 1 the channel is flat and the orange sits on the blue everywhere. Raise
L and watch the orange scatter — not uniformly, in PATCHES: some carriers come
back clean and others are a mess, and the pattern does not move when you press
R. That is the channel, not the noise, and the next tabs are two ways of
looking at it.

Walk the pill across the carriers and the green point moves through the good
patches and the bad ones. Stop on a bad one, then go to the constellation tab:
it is the cloud of that carrier alone, across all the frames.

The abscissa here is the carrier index and not time. Time is the next tab.`,
  },
  {
    id: 'absorb',
    title: 'The prefix absorbs the channel',
    view: 'time',
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
    // Declared, and it has to be: the two time views now come first, so a scene
    // that says "look at the channel" would otherwise open on the waveform.
    view: 'channel',
    params: { Nc: 64, L: 6, cp: 8, snr: 15, M: 150, k: 23 },
    visible: ['k', 'L'],
    notes: `Six paths, and the channel spectrum becomes a landscape of ridges and
FADES at −20 or −30 dB. Pressing R gives another channel every time, always with
holes.

The orange vertical is the carrier being read, and it is the thread through the
whole experiment: drag k along the landscape and the statline follows with
|H_k|² and that carrier's own error rate. Park it on a ridge, then let it fall
into a fade and watch the two numbers change by twenty decibels and two orders
of magnitude. The constellation tab shows what that carrier looks like, the
error tab shows what it costs.

The question to ask: what can a carrier at the bottom of a hole transmit?
Nothing, and no equalizer will get it out. Dropping L to 1 flattens the channel
again — the selectivity comes from the ECHOES.`,
  },
  {
    id: 'one-tap',
    title: 'The miracle of the FFT',
    view: 'constellation',
    params: { Nc: 64, L: 6, cp: 8, snr: 20, M: 150, k: 23 },
    visible: ['k', 'snr'],
    notes: `ONE subcarrier at a time — carrier 23 to begin with, which sits on a
ridge of the channel. In purple, what arrives: a QPSK rotated and scaled by H_23
and nothing else. In blue, after ONE division by that one coefficient, the QPSK
is back where it belongs.

That is the central theorem, and it is worth naming: with the prefix in place the
convolution becomes circular, the FFT DIAGONALIZES the channel, and the sixty-tap
equalizer of a single-carrier receiver has become 64 divisions.

Now walk k along the pill, with the "channel" tab open in your head — or switch
to it, where a vertical marks where you are. Every carrier has its own H_k, so
every carrier has its own picture: tight on a ridge, and at carrier 55, which
sits 14 dB down in a fade, the purple cloud collapses onto the origin and the
blue one is blown apart. The division that saved carrier 23 amplifies the noise
of carrier 55 by the same factor.

Worth saying out loud when someone asks: there is no place in the TIME signal
that is carrier k. Every sample carries all sixty-four of them at once — that is
what the IFFT does, and why the first two tabs have no carrier marker.`,
  },
  {
    id: 'prefix',
    title: 'Sabotaging the prefix',
    view: 'constellation',
    params: { Nc: 64, L: 6, cp: 8, snr: 25, M: 50, seed: 5 },
    visible: ['cp', 'k'],
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
    params: { Nc: 64, L: 6, cp: 8, snr: 12, M: 200, k: 55 },
    visible: ['k', 'snr'],
    notes: `The BER carrier by carrier, as points, over the zero-forcing theory
Q(√(|H_k|²·SNR)) in orange. Putting it side by side with the channel tab shows
the error peaks landing EXACTLY on the fades.

The vertical marks the carrier the constellation tab is showing, so the three
views can be read as one: move k onto a peak of this curve, go and look at what
that carrier's constellation looks like, then come back. At carrier 55 the
statline reads its own BER — 5 % against an average of 0.16 % — and the
constellation two tabs away is why.

Which is why OFDM never lives alone: interleaving plus coding — see the Hamming
and soft-decoding experiments — spread the information across good and bad
carriers alike.`,
  },
];
