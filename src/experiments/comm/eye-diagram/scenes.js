// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'healthy',
    title: 'Reading a healthy eye',
    view: 'time',
    params: { levels: 2, alpha: 0.35, bt: 8, sigma: 0.02, Nsym: 200 },
    visible: ['alpha'],
    notes: `Two hundred slices of 2T superimposed make the eye. Between the
instants the signal wanders freely, but at t = T, on the yellow line, ALL the
traces pass through ±1: that is the Nyquist criterion of the raised cosine, with
the ISI cancelling exactly where the decision is made.

Lowering α toward 0.05 keeps the eye open AT the exact instant while closing it
horizontally — an imprecise clock stops being forgiven. α is the bandwidth paid
for timing tolerance.`,
  },
  {
    id: 'isi',
    title: 'The channel closes the eye',
    view: 'eye',
    params: { levels: 2, alpha: 0.35, bt: 8, sigma: 0.02, Nsym: 200 },
    visible: ['bt', 'sigma'],
    notes: `Freezing the healthy eye and then reducing B·T shows a channel too
narrow spreading each pulse over its neighbours: the ISI closes the eye
vertically and SHIFTS the optimal instant, through the group delay.

Around B·T ≈ 0.4 the eye is shut — no threshold separates the levels at any
instant — and the statline measures the agony, the opening falling from about
1.9 to negative. Raising σ afterwards does the same thing without the shift.`,
  },
  {
    id: '4pam',
    title: '4-PAM: three eyes stacked',
    view: 'eye',
    params: { levels: 4, alpha: 0.35, bt: 8, sigma: 0.02, Nsym: 400 },
    visible: ['levels', 'sigma'],
    notes: `Two bits per symbol means four levels and THREE eyes, each a third of
the size of the 2-PAM one.

The sampling-instant view shows four well-separated packets, as long as σ stays
modest. Raising σ to 0.1 makes them touch: 4-PAM breaks first, exactly as 16-QAM
broke before QPSK in the constellation experiment. The same currency — rate is
paid for in noise margin.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
