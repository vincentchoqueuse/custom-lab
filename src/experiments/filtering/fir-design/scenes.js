// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'through',
    title: 'The signal goes in, the signal comes out',
    view: 'response',
    params: { fc: 1000, N: 21, win: 'hann' },
    visible: ['fc'],
    notes: `The filter at work, before any theory: a signal goes in and its
filtered version comes out — LATE, shifted by (N−1)/2 samples. That delay is not
a misconfiguration but the price of causality, and scene 5 measures it.

The question to ask is where the content above f_c went. Moving f_c smooths the
output further. The next tabs show where the behaviour comes from: first the
coefficients, then the frequency response.`,
  },
  {
    id: 'truncate',
    title: 'Truncating the infinite',
    view: 'impulse',
    params: { fc: 1000, N: 21, win: 'rect' },
    visible: ['N'],
    notes: `The ideal response, in orange, is an INFINITE and non-causal sinc.
Only N coefficients are kept, recentred at (N−1)/2 — the delay was born there,
before any calculation. Raising N makes the bars follow the sinc more and more
closely.

What each extra coefficient costs is worth asking: one multiplication per
sample, and more delay, which is scene 5.`,
  },
  {
    id: 'gibbs',
    title: 'Gibbs does not give way',
    view: 'gain',
    params: { fc: 1000, N: 21, win: 'rect' },
    visible: ['N'],
    notes: `With raw truncation the first stop-band lobe sits at −21 dB.

Freezing and taking N from 21 to 101 STEEPENS the transition — and leaves the
lobe at −21 dB. The Gibbs phenomenon does not yield to the number of
coefficients. This is the instructive failure: adding computation is not enough,
the method has to change.`,
  },
  {
    id: 'windows',
    title: 'The window buys decibels',
    view: 'gain',
    params: { fc: 1000, N: 45, win: 'rect' },
    visible: ['win', 'N'],
    notes: `Same N, different window: rectangular −21 dB, Hann −44, Hamming −53,
Blackman −74, all in the statline. The price is a transition band that widens by
as much.

This is EXACTLY the trade-off of the spectral-windowing experiment — the same
mathematics, applied this time to synthesis. Choosing a window is choosing where
to spend one's decibels.`,
  },
  {
    id: 'delay',
    title: 'Clean, but late',
    view: 'response',
    params: { fc: 500, N: 81, win: 'hamming' },
    visible: ['N'],
    notes: `A square wave goes in and a smoothed version comes out, shifted by
EXACTLY (N−1)/2 samples — 5 ms at N = 81, in the statline. The phase is linear,
so every frequency waits the same time and the shape is preserved.

Lowering N melts the delay away, and the smoothing with it. The closing question:
why would a musician refuse a filter with 4001 coefficients? Because that is
250 ms of latency.`,
  },
];
