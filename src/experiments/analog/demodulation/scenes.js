// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'envelope',
    title: 'Two pieces of information in one curve',
    view: 'time',
    params: { fc: 1000, ka: 0.5, fam: 40, fdev: 200, ffm: 25, snr: 40 },
    visible: ['ka', 'snr'],
    notes: `The grey signal is modulated in amplitude AND in frequency at the
same time. The yellow curve is the true envelope, the thing being looked for,
and the two estimates land on it indistinguishably.

The method question is worth asking before the result question, because these
two curves come from calculations with nothing in common.

  HILBERT is GLOBAL: an FFT over the whole record, the negative frequencies
  removed, and A = |x + j·H{x}|. The value at time t depends on ALL the
  samples, including those that come after it. There is no real-time
  demodulation anywhere in that.

  TEAGER is LOCAL: Ψ(x)[n] = x[n]² − x[n+1]·x[n−1]. Three samples, two
  multiplications, and that number already equals A²sin²Ω. No transform, no
  latency, and a cost per point independent of the length of the signal.

Raising k_a to 0.9 keeps both faithful. The result is the same; the price is
not, and the third scene is where the difference gets paid.`,
  },
  {
    id: 'frequency',
    title: 'And the frequency, from the same curve',
    view: 'freq',
    params: { fc: 1000, ka: 0.5, fam: 40, fdev: 200, ffm: 25, snr: 40 },
    visible: ['fdev', 'ffm'],
    notes: `The second piece of information, extracted from the SAME signal. The
instantaneous frequency swings between 800 and 1200 Hz and both methods follow
it.

Hilbert differentiates the unwrapped phase, so the phase has to be unwrapped
first, and a badly unwrapped jump shows immediately. Teager unwraps nothing: it
reads Ω directly out of a ratio of energies.

Raising Δf and f_FM keeps both honest as long as the estimate stays inside its
domain. The green line announces what happens outside it, which is scene 4.

With no noise at all, neither is exact on this signal: 2.1 Hz of error for
Teager and 3.4 Hz for Hilbert, in the statline. That is not noise but COUPLING
— amplitude and frequency move together, and both methods implicitly assume
they move slowly compared with the carrier.`,
  },
  {
    id: 'noise',
    title: 'What locality costs',
    view: 'freq',
    params: { fc: 1000, ka: 0.5, fam: 40, fdev: 200, ffm: 25, snr: 20 },
    visible: ['snr'],
    notes: `The prediction is worth collecting before lowering the SNR: which of
the two gives way first?

The measured RMS frequency errors:

    SNR 40 dB → Hilbert 8.9 Hz,  Teager 17.6 Hz
    SNR 30 dB → Hilbert 26 Hz,   Teager 59 Hz
    SNR 20 dB → Hilbert 84 Hz,   Teager 266 Hz
    SNR 10 dB → Hilbert 287 Hz,  Teager 548 Hz

Teager degrades two to three times faster, and the reason is in its definition:
Ψ is a PRODUCT of neighbouring samples, so noise enters it squared and nothing
averages it away. Hilbert computes an FFT, and an FFT IS an average over the
whole record. The locality that made Teager free is exactly what makes it
fragile.

One rare property is worth showing: Teager ANNOUNCES its own failure. The
statline counts the out-of-domain arccos calls — none up to 30 dB, 42 at 20 dB,
233 at 10 dB. When the argument of the arccos leaves [−1, 1] the local
sinusoidal model no longer holds, and the algorithm knows it.`,
  },
  {
    id: 'fold',
    title: 'Where Teager folds back',
    view: 'freq',
    params: { fc: 1800, ka: 0.5, fam: 40, fdev: 400, ffm: 25, snr: 50 },
    visible: ['fc', 'fdev'],
    notes: `There is almost no noise here, and yet the orange curve does
something absurd above the green line while the blue one follows perfectly. So
this is not a noise problem.

DESA-2 obtains the pulsation as Ω = ½·arccos(…). The arccos returns [0, π], so
Ω cannot exceed π/2 and f cannot exceed Fs/4 = 2000 Hz. Above that the estimate
folds exactly as undersampling folds, and the harness verifies that the error
equals exactly 2(f − Fs/4).

The carrier is at 1800 Hz for this scene with a deviation of 400, so the
instantaneous frequency sweeps 1400 to 2200 Hz and crosses the green line from
below while staying firmly positive. (Lowering the carrier instead would take
f_i below zero, where the analytic signal stops meaning anything and BOTH
methods fail — a different problem, not worth mixing in here.)

Sliding f_c from 1800 down to 1400 brings the orange curve back onto the yellow
one as soon as the whole sweep is under the line.

The moral is not that Teager is worse. It is that an estimator has a DOMAIN,
that this domain follows in two lines from its formula, and that nobody notices
it by reading the result alone.

Hilbert has one too, less visible and therefore more treacherous: the DFT
treats the record as PERIODIC. A carrier that does not close exactly on the N
samples creates a wrap-around discontinuity whose leakage is GLOBAL rather than
confined to the edges. Measured by the harness: exact to 1e-10 when the carrier
lands on a DFT bin, 8.5 Hz of error when it lands at 153.6 bins. Nothing in the
curve says so; only the calculation does.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
