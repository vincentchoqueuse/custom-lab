// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'confidence',
    title: 'Confidence thrown away',
    params: { code: 'hamming74', ebn0Db: 3, Nbits: 40000 },
    visible: ['code', 'ebn0Db'],
    notes: `A sample received at +0.05 votes "0" — without conviction. The hard
decision keeps the vote and DISCARDS the conviction; the soft decoder correlates
the seven received values against the sixteen possible codewords and keeps
everything.

On screen: the same frames, the same noise, two decoders. The large orange dots
without a purple one on top are the hard failures repaired by the soft decoder.
Pressing R shows the purple set almost always contained in the orange one — soft
dominates frame by frame, not merely on average.`,
  },
  {
    id: 'two-db',
    title: 'Two free decibels',
    params: { code: 'hamming74', ebn0Db: 5, Nbits: 40000 },
    view: 'ber',
    visible: ['code', 'ebn0Db'],
    notes: `The HORIZONTAL gap between the orange curve (hard, exact) and the
purple points (soft) is about 2 dB at a BER of 10⁻⁴ — same code, same
transmitted bits, same energy, and only the receiver changed.

The union bound, dashed, sits on the points from 4 or 5 dB upward: at high SNR
the error goes to the NEAREST codeword, at distance 3, and the bound counts
nothing else. Two free decibels is why no modern receiver decides hard.`,
  },
  {
    id: 'repetition',
    title: 'Repetition redeemed',
    params: { code: 'repetition3', ebn0Db: 4, Nbits: 40000 },
    view: 'ber',
    visible: ['code', 'ebn0Db'],
    notes: `The plausible bad idea returns. Decoded hard, repetition ×3 lost
everywhere. Decoded soft, averaging the three samples adds three thirds of the
energy back together and recovers ALL of it: the purple points land EXACTLY on
the uncoded curve, neither better nor worse, at Q(√(2γb)).

That is the matched filter — worth revisiting that experiment — disguised as a
code. The closing moral of the chapter: soft repetition gains nothing while soft
Hamming gains 2 dB. Structure AND confidence, both of them.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
