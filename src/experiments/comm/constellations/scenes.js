// Lecture script. Auto-discovered by the registry.
const BASE = { mod: 'qpsk', mapping: 'gray', ebn0Db: 8, N: 3000, seed: 34 };

export default [
  {
    id: 'baseband',
    title: 'What actually travels: two signals',
    view: 'time',
    params: { ...BASE },
    visible: ['mod', 'ebn0Db'],
    notes: `Before the plane, the signal. Twenty-four QPSK symbols in time, in
blue what was sent and in orange what came back — and TWO panels, because a
symbol is a complex number and a complex number does not fit on one ordinate.
Re on top, Im underneath, the same instant read straight down.

The question that makes the whole subject click, asked here and not later:
"how many real signals leave the transmitter?" Two. They travel on two carriers
in quadrature, and everything after this is about the pair.

On QPSK at 8 dB the stalks take four values, ±0.707 on each panel, and the
orange lands near the blue without reaching the neighbouring level. Take Eb/N₀
down: the orange starts to wander, and somewhere around 4 dB it crosses. THAT
crossing is the error, and the next tab is this same picture with the time
thrown away — every pair (Re, Im) plotted as one point.`,
  },
  {
    id: 'qpsk',
    title: 'QPSK, comfortable',
    view: 'iq',
    params: { ...BASE, ebn0Db: 10 },
    visible: ['mod', 'ebn0Db'],
    notes: `Four clouds around four symbols, and the dashed lines are the exact
decision boundaries: the receiver keeps the nearest point, so the boundaries are
the perpendicular bisectors, which for QPSK are the axes. The vocabulary belongs
here — transmitted symbol, complex noise, decision region.

Lowering Eb/N₀ inflates the clouds, and the first coloured errors cross the
boundaries around 4 dB. Press R and watch the errors move while their NUMBER
stays put: this is a probability, not an accident.

Worth noticing before the next scene: every error here is YELLOW. On QPSK with
Gray mapping a near miss crosses one boundary and costs exactly one bit. Hold
on to that — the next scene breaks it.`,
  },
  {
    id: 'gray',
    title: 'Gray against natural binary',
    view: 'iq',
    params: { ...BASE, mod: '16qam', ebn0Db: 10 },
    visible: ['mapping', 'mod'],
    notes: `Sixteen symbols, each labelled with the four bits it carries. Read a
few neighbouring labels out loud with the mapping on Gray: 0000, 0001, 0011 —
one bit apart every time, in both directions. That is the whole of Gray coding,
and it is a numbering, not a code: no redundancy, no rate lost.

Now switch the pill to natural binary and read the same neighbours: 0011 and
0100 differ in three bits. Nothing about the geometry changed — same points,
same noise, same decision regions — but ORANGE points appear, and orange means
a symbol error that cost more than one bit.

The count is the lesson. The SER is identical between the two mappings, to
within the draw: the receiver decides on geometry and has never heard of the
labels. The BER is not. Gray costs nothing and buys almost a factor of two at
16-QAM; a numbering chosen for convenience throws it away.

Then take the SNR down and let the room watch the orange grow faster than the
yellow: as the clouds spread, errors stop being near misses.`,
  },
  {
    id: 'waterfall',
    title: 'Symbols, bits, and the honest axis',
    view: 'waterfall',
    params: { ...BASE, mod: '16qam' },
    visible: ['mod', 'mapping'],
    notes: `Two pairs of curves on one frame. Orange is the SER, purple the BER,
dashes are theory and dots are the simulation.

Read the vertical gap first. At high SNR under Gray mapping the two sit a factor
k apart — 4 for 16-QAM, which is 6 dB of nothing, just a division by four —
because a symbol error then costs exactly one bit. Ask the room to predict the
gap for 8-PSK before switching to it.

Then switch the mapping to natural binary. The ORANGE curves do not move at all;
the purple measurement lifts off its theory line. One picture, two facts: the
mapping is invisible to the decision and decisive for the bits.

Last, the abscissa, which is the quiet argument of the whole tab. It is Eb/N₀
and not Es/N₀. Per symbol, 16-QAM would look like a bargain — four bits for the
energy QPSK spends on two. Per bit it pays about 4 dB at a BER of 1e-4, and that
is the number that goes in a link budget. Step through BPSK and QPSK and let
them find the coincidence themselves: identical, exactly, because QPSK is two
orthogonal BPSKs sharing the energy of one.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
