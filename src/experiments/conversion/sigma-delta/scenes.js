// Lecture script. Auto-discovered by the registry.
const BASE = { bits: 1, order: 1, osr: 64, amp: 0.4, fin: 0.4 };

// PLAN — context 1 · method 2-3 · invoice 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'one-bit',
    title: 'One comparator, and a sine comes back out',
    view: 'time',
    params: { ...BASE },
    visible: ['bits', 'osr'],
    notes: `The grey trace is the entire output of the converter: a stream of
±1, one comparator, nothing else. The orange trace is what went in. The blue
one is what a low-pass filter gets back out of the grey stream, and it is the
orange one.

Let the room sit with that for a moment, because it should look impossible. A
single comparator carries no amplitude information at all — and the statline
says the result is worth better than seven effective bits.

The trick is in the DENSITY of the ones. Where the input is high the stream is
mostly +1; where it is low, mostly −1. The information is in a local average,
which is exactly what the filter downstream computes, and the price is that
there are sixty-four samples per useful sample.

Take OSR down to 8 and watch the blue trace come apart. Take b up to 4 and
watch it improve — but note in the statline that four bits at OSR 64 is not
four times better, it is 18 dB better, which is the same 6 dB per bit as
everywhere else. The interesting axis is the other one.`,
  },
  {
    id: 'where',
    title: 'Where the noise went',
    view: 'spectrum',
    params: { ...BASE },
    visible: ['order', 'osr'],
    notes: `The spectrum of that bit stream, and the answer to "but where did
the error go".

The signal is a single line inside the band. Below the yellow edge the floor is
extremely low; above it, it climbs steadily to Fs/2. The orange curve is
|2 sin(πf)|^L — the noise transfer function the modulator was designed to,
plotted from its closed form and not fitted — and the measured floor lies on
it.

The mechanism is worth stating in one sentence: the loop feeds its own
quantization error back, so the error appears at the output filtered by
(1 − z⁻¹)^L, which is zero at DC. It cannot make the error smaller. It can
choose the frequency at which it lives.

Switch L from 1 to 2 and watch the floor tip further: the slope doubles, the
in-band floor drops by another twenty-odd decibels, and the out-of-band floor
rises to pay for it. That last part is the invoice, and the next scene puts a
number on it.

Then take OSR from 64 to 8 and watch the yellow line walk right into the shaped
noise. The whole method is the distance between that line and where the noise
starts.`,
  },
  {
    id: 'law',
    title: 'Nine decibels per octave, and fifteen',
    view: 'sqnr',
    params: { ...BASE, order: 1 },
    visible: ['order', 'bits'],
    notes: `Each point on this curve re-runs the modulator at that
oversampling ratio and MEASURES the in-band SQNR. The two dashed lines are the
theory, anchored on the middle point: 9 dB per octave at first order, 15 at
second.

Read the exchange rate out loud, because it is what the chapter is for. A bit
of resolution buys 6 dB. An octave of speed buys 9 dB at first order — a bit
and a half — or 15 dB at second, two and a half bits. Silicon that is fast is
cheaper than silicon that is precise, and that sentence is the whole reason
every audio and every instrumentation converter built since 1990 is a ΣΔ.

Flip L between 1 and 2 and watch the measured curve change which dashed line it
follows. Then take b from 1 to 4: the curve slides UP by about 18 dB and keeps
the same slope. Resolution is an offset, oversampling is a slope, and only one
of them compounds.`,
  },
  {
    id: 'invoice',
    title: 'The invoice: shaping moves noise, it does not remove it',
    view: 'spectrum',
    params: { ...BASE, bits: 4, order: 2, osr: 32 },
    visible: ['order', 'bits'],
    notes: `The scene that keeps the chapter honest, and the number is exact.

In this form the output is y = x + (1 − z⁻¹)^L·e, so the total output noise
power is σ_e² times the sum of the squared coefficients of that polynomial —
and for (1 − z⁻¹)^L that sum is the central binomial coefficient C(2L, L): 2 at
first order, 6 at second. The statline reports the measured ratio and it lands
on 5.97 here, against 6.

So: 3 dB worse in total at first order, 7.8 dB worse at second. Every decibel
gained inside the band is paid for, with interest, outside it. What makes the
trade worth taking is not that the noise got smaller — it did not — but that
the decimator throws away the part of the spectrum where it was put.

Now the honest limit, and it is worth showing. Take b back down to 1 and watch
that ratio stop matching: 2.74 instead of 2 — and at four bits and first order
it is already 1.77, so the model degrades well before one bit. The identity above assumes the
quantization error is WHITE, and at one bit it is nothing of the kind — it is
produced by the signal and correlated with it. The linear model that the whole
design rests on is a model, it is excellent at four bits, and at one bit it is
a useful lie. The harness pins the exact half of the statement — y − x is the
convolution of e with those coefficients, to 1e-15, at any resolution — and
measures where the statistical half stops holding.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
