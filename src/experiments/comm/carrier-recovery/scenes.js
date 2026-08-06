// Lecture script. Auto-discovered by the registry.
const BASE = {
  mod: 'qpsk', ebn0Db: 12, phi0: 35, dfreq: 0,
  algo: 'costas', blt: 0.005, zeta: 0.707, order: 2, block: 64, N: 6000, seed: 34,
};

export default [
  {
    id: 'turning',
    title: 'The constellation is turning',
    view: 'constellation',
    params: { ...BASE, dfreq: 0.3, algo: 'costas' },
    visible: ['dfreq', 'phi0'],
    notes: `The grey cloud is what arrives. It is a RING, and there is nothing
wrong with the link: the transmitter's oscillator and the receiver's are two
different crystals, off by a few parts per million, so the phase between them
walks. Every other experiment in this subject has quietly assumed that away.

The blue cloud is the same symbols after the Costas loop. Four points, where
they belong.

Take Δf to zero and the ring becomes an arc, then a rotated constellation: a
pure phase offset. Put Δf back and watch the ring close again. The two are not
the same problem — a constant to estimate against a ramp to track — and the
loop-order pill in the drawer is where that difference lives.

Worth doing once before moving on: set Δf = 0, θ₀ = 0, and note that the blue
cloud may STILL be rotated by 90°. Nothing is broken. That is the next scene.`,
  },
  {
    id: 'ambiguity',
    title: 'The ambiguity no loop can lift',
    view: 'scurve',
    params: { ...BASE, mod: 'qpsk' },
    visible: ['mod', 'algo'],
    notes: `This is the detector's characteristic: the average error it reports
against the phase error it is actually seeing. A loop drives this to zero, and
it can only settle where the curve crosses zero going UP — the yellow points.

There are FOUR of them, ninety degrees apart, and that is the whole scene. The
detector never sees the data; it sees a constellation that is symmetric under a
90° rotation, so it cannot tell a correct lock from one three points along. The
curve has period 2π/M exactly — the harness checks that on the noiseless
characteristic, to machine precision — and every one of the M zeros is a stable
equilibrium.

Change the modulation and count: BPSK has two lock points at 180°, QPSK four at
90°, 8-PSK eight at 45°. The ambiguity is the constellation's own symmetry and
nothing else.

Then say what is done about it, because a room will ask. Not a better loop —
there is no better loop, the information is not in the signal. Either a known
preamble, or differential encoding, which puts the bits in the DIFFERENCE
between consecutive symbols and is therefore immune to a constant rotation. The
price is about 3 dB, and it is paid on every burst link in the world.

Last, switch the method to Viterbi & Viterbi. Same period, same M points. It
raises the sample to the Mth power to strip the modulation and then divides the
angle by M — and dividing an angle by M is where the ambiguity is born, in one
line of arithmetic.`,
  },
  {
    id: 'order',
    title: 'A ramp needs an integrator',
    view: 'tracking',
    params: { ...BASE, ebn0Db: 25, dfreq: 0.4, blt: 0.003, order: 1 },
    visible: ['order', 'dfreq'],
    notes: `A frequency offset is a phase RAMP, and a first-order loop cannot
track a ramp without an error. Here it is: the trace settles, but not on zero —
it settles on a constant bias, and the statline reports it.

Double Δf and the bias doubles. That is not a rule of thumb, it is the loop's
transfer function: the static error is 2π·Δf divided by the loop gain, so it is
proportional to the offset. The harness measures the ratio and pins it at two.

Now flip the loop order to 2. The bias goes to zero — not small, zero, at
0.0003° against 4.6° a moment ago. The second integrator is what makes the
steady state exact, and this is the same statement as "a type-2 servo has no
static error on a ramp", one subject away in Control.

The cost is on the other tab: two integrators can ring, and taking ζ below 0.4
shows it. Nothing here is free either.`,
  },
  {
    id: 'jitter',
    title: 'How wide should the loop be?',
    view: 'jitter',
    params: { ...BASE, ebn0Db: 12, algo: 'costas', order: 2 },
    visible: ['blt', 'ebn0Db'],
    notes: `The design question, and it has a closed-form answer worth knowing
by heart. A loop of bandwidth B_L·T admits noise in proportion, so its phase
jitter is

    σ²_φ = 1/(2ρ_L),   ρ_L = (Es/N₀)/(2·B_L·T)

The blue curve re-runs the loop at each bandwidth and measures the jitter; the
orange one is that formula. They lie on each other over two decades — a slope
of one half in log-log, which is what "jitter grows as the square root of the
bandwidth" looks like.

So narrow is better, and the room should be asked why anyone would ever widen
it. Two reasons, and both are on the other tabs: a narrow loop ACQUIRES slowly
— take B_L·T to 1e-4 and go back to the tracking tab to watch it crawl in — and
a narrow loop cannot follow a frequency offset that drifts.

That is the whole of loop design in one sentence: the bandwidth is a bet on how
fast the phase moves against how much noise you will accept, and there is no
setting that wins both.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
