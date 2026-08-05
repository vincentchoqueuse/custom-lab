// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'baseband',
    title: 'The chain, from the top: two real signals',
    params: { mod: 'qpsk', mapping: 'gray', ebn0Db: 8, Nbits: 20000 },
    view: 'time',
    visible: ['ebn0Db'],
    notes: `Start where a bench starts, not where a textbook does. Twenty-four
symbols in time: blue what the modulator produced, orange what the demodulator
was handed. Two panels, because a QPSK symbol is a complex number and there is
no honest way to draw one on a single ordinate.

Ask the room to count the levels on the top panel. Two, at ±0.707. Same
underneath. Four combinations, two bits — the whole of QPSK, before the word
constellation is used.

Take Eb/N₀ down to 4 dB and hammer R. The orange drifts further from the blue
and, now and then, past the midline: that is a bit error, and the next tab
counts them.`,
  },
  {
    id: 'honest-eb',
    title: 'Eb/N₀: the honest comparison',
    params: { mod: 'qpsk', mapping: 'gray', ebn0Db: 6, Nbits: 20000 },
    view: 'ber',
    visible: ['mod', 'ebn0Db'],
    notes: `Why Eb/N₀ and not Es/N₀? Because the energy is paid PER BIT
carried.

Switching from BPSK to QPSK makes the BER curves COINCIDE: QPSK carries two bits
for the same Eb/N₀, an apparent gift that is really two orthogonal BPSKs, on I
and on Q. That is the result that surprises — at equal energy per bit, doubling
the rate of BPSK is free. 8-PSK and 16-QAM do pay, because their neighbours
close in faster than k grows.`,
  },
  {
    id: 'gray',
    title: 'Gray against natural binary',
    view: 'mapping',
    params: { mod: '16qam', mapping: 'gray', ebn0Db: 8, Nbits: 40000 },
    visible: ['mapping'],
    notes: `On the constellation view with Gray mapping, every neighbour differs
by ONE bit — the labels say so. A symbol error, which almost always goes to a
neighbour, therefore costs a single bit, and the errors are yellow.

Switching to natural binary creates neighbours two bits apart — 0111 next to
1000 along one axis — and RED errors appear: the same SER, more wrong bits. On
the BER view the Monte Carlo points lift off the Gray theory curve. The mapping
costs no energy and buys decibels, so Gray is always the answer.`,
  },
  {
    id: 'cascade',
    title: 'Reading the cascade',
    params: { mod: '16qam', mapping: 'gray', ebn0Db: 10, Nbits: 40000 },
    view: 'ber',
    visible: ['mod', 'ebn0Db'],
    notes: `The engineer's reading, on the log axis: at a BER of 10⁻³, read the
required Eb/N₀ for each modulation — about 6.8 dB for BPSK and QPSK, 3.5 dB more
for 8-PSK, another 3.3 for 16-QAM.

Each extra bit per symbol is paid for in power and saves bandwidth. The
rate–power–bandwidth trade-off is the whole trade, and it is entirely in that
reading. The closing question: how does one get BELOW those curves? Error-
correcting codes, next chapter.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
