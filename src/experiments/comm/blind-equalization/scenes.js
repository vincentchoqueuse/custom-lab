// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'blind',
    title: 'It works, and nothing was taught to it',
    view: 'constellation',
    params: { mod: 'qpsk', h: [1, 0.5, -0.2], phi: 0, snr: 25, L: 11, mu: 0.002, n: 0, seed: 34 },
    visible: ['n', 'mu'],
    notes: `Start at n = 0: the equalizer is a single spike, so the blue cloud sits
on top of the grey one and the channel is untouched. Four blobs, no constellation.

Then take n up to the end. The cloud closes onto the four yellow points, and the
question to ask before it does is the one that matters: what told the algorithm
where those points were? Nothing did. It never saw a transmitted symbol. All it
was given is that a QPSK has ONE modulus, and minimising the spread of |y| around
that modulus was enough to undo the channel.

The "Channel ∗ equalizer" tab is where this stops being an impression: the
composed response collapses to a single spike, which is the definition of a
channel undone.`,
  },
  {
    id: 'rotation',
    title: 'It converges up to a rotation',
    view: 'constellation',
    params: { mod: 'qpsk', h: [1, 0.5, -0.2], phi: 40, snr: 25, L: 11, mu: 0.002, n: 8000, seed: 34 },
    visible: ['phi', 'n'],
    notes: `The receiver now ignores a carrier phase of 40°. Freeze (F), then move φ.

The constellation follows the angle — and the residual rotation in the statline
reads it back to within a few tenths of a degree. But look at the residual ISI
while you turn: it does not move. The channel is just as undone at 70° as at 0°.

The reason is one line of algebra: the cost depends on |y| only, so J(w·e^{jφ})
= J(w) for every φ. Every rotated equalizer is an equally good minimum, and the
algorithm has no way to prefer one. Ask the room what a receiver is supposed to
do about it — the answers are the real ones: send a pilot, or encode the bits
differentially so that only phase DIFFERENCES carry information.`,
  },
  {
    id: 'qam',
    title: 'What a constant modulus was really buying',
    view: 'constellation',
    params: { mod: '16qam', h: [1, 0.5, -0.2], phi: 0, snr: 30, L: 11, mu: 0.002, n: 8000, seed: 34 },
    visible: ['mod', 'mu'],
    notes: `Switch the constellation to 16-QAM and watch the cost view. An orange
line has appeared that was not there before, and the curve comes down and stops
on it.

That line is not a tuning limit, and no step size will get under it. A 16-QAM has
three distinct moduli, so even a PERFECT equalizer leaves J = E[(|s|²−R₂)²],
which for the unit-energy 16-QAM is exactly 0.4224. On a PSK the same quantity is
exactly zero, which is why no line was drawn in the previous scenes.

If the room wants to see where 0.4224 comes from, it splits in two: the spread of
|s|² around its own mean (0.32) plus the offset between that mean and R₂, squared
(0.1024). A constant modulus kills both at once.

Worth saying out loud: the constellation still opens rather well here. The
algorithm is not broken — its criterion has simply stopped being the right one,
and in practice one switches to a decision-directed mode once the eye is open
enough.`,
  },
  {
    id: 'step',
    title: 'The step size, with nobody to warn you',
    view: 'constellation',
    params: { mod: 'qpsk', h: [1, 0.5, -0.2], phi: 0, snr: 25, L: 11, mu: 0.008, n: 8000, seed: 34 },
    visible: ['mu', 'seed'],
    notes: `The same trade-off as the supervised experiment — a large step converges
fast and settles high, a small one the reverse — with one difference that is the
whole point of this scene: there is no reference here, so nothing measures the
error. A receiver in this state cannot tell a poor minimum from a good one.

Take μ down towards 1e-4 and back up. Then hammer R at the top of the range: the
cost is not the same story from one draw to the next, and the composed response
occasionally settles on a different delay, or on a spike that is not alone. The
CMA cost is not convex, and the centre-spike initialisation is a bet on where the
useful delay sits.`,
  },
];
