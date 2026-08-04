// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'qpsk',
    title: 'QPSK, comfortable',
    params: { mod: 'qpsk', snrDb: 15, N: 2000 },
    visible: ['snrDb'],
    notes: `Four well-separated clouds around the four yellow symbols: at 15 dB
the nearest-neighbour decision, whose boundaries are the dashed axes, is almost
never wrong. The vocabulary belongs here — transmitted symbol, complex noise,
decision region.

Lowering the SNR live inflates the clouds, and the first orange errors cross the
boundaries around 6 to 7 dB. Pressing R moves the errors around while their
NUMBER stays stable: this is a probability, not an accident.`,
  },
  {
    id: 'qam',
    title: '16-QAM: the price of four bits',
    params: { mod: '16qam', snrDb: 15, N: 4000 },
    visible: ['mod', 'snrDb'],
    notes: `Same average energy, same noise, but sixteen symbols instead of four:
the decision regions shrink and orange errors already appear at 15 dB, where
QPSK was spotless.

Which symbols get it wrong most is worth asking — the four in the middle, with
four neighbours each, then the edges with three, while the corners cope best
with two. Doubling the bits per symbol is paid for in decibels: freeze on QPSK,
switch to 16-QAM, compare.`,
  },
  {
    id: 'ser',
    title: 'The cascade of curves',
    params: { mod: '16qam', snrDb: 12, N: 4000 },
    view: 'ser',
    visible: ['mod'],
    notes: `The SER axis is LOGARITHMIC, so each gridline is a factor of ten. The
Monte Carlo points sit on the theory until errors become too rare to count — a
lesson in itself, since simulating a SER of 1e-6 takes millions of symbols.

Stepping through BPSK, QPSK, 8-PSK and 16-QAM shifts the curves to the right. At
a SER of 1e-3 the gap between QPSK and 16-QAM is about 7 dB, which is the price
in power of doubling the rate. Sizing a link is that reading and little else.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
