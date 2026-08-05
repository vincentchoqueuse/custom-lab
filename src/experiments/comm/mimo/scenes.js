// Lecture script. Auto-discovered by the registry.
//
// Written to be played right after `comm/constellations`: same subject, same
// unit-energy constellations, same Es/N₀, same SER formula. One antenna became
// two, and the whole script is what that costs.
const BASE = { mod: 'qpsk', rho: 0.5, snr: 12, eq: 'zf', N: 1500, seed: 34 };

export default [
  {
    id: 'mixture',
    title: 'Two symbols at once, and two mixtures',
    params: { ...BASE, rho: 0.5 },
    visible: ['rho'],
    notes: `Two QPSK symbols leave at the same instant, on the same frequency,
from two antennas. Two antennas receive. Look at what arrives: neither cloud is a
constellation any more — each antenna sees a mixture of both streams, and no
amount of staring at one of them recovers anything.

Ask the room whether information has been lost. It has not: two equations, two
unknowns, and H is invertible. The whole experiment is the gap between
"solvable" and "solvable without paying for it".

The black points are the sixteen vectors H·x the transmitter can possibly
produce — one per pair of symbols. That lattice is the whole of the maximum
likelihood receiver: it measures a distance to sixteen candidates and keeps the
nearest. No inversion anywhere, which is why it will turn out to be the one that
does not pay.`,
  },
  {
    id: 'orthogonal',
    title: 'ρ = 0: two AWGN channels, and nothing more',
    view: 'ser',
    params: { ...BASE, rho: 0 },
    visible: ['rho', 'snr'],
    notes: `Set ρ to 0. The two spatial channels are then orthogonal, and
something exact happens: the three curves fall on top of one another, and on top
of the grey dashed line — which is the single-antenna AWGN theory, the curve of
"Constellations in noise" two tabs away in this same subject.

That is not a resemblance, it is an identity. With HᴴH = I the zero-forcing
matrix is Hᴴ, a unitary; a unitary leaves white noise white and does not change
its variance, so each stream sees exactly the Es/N₀ that was dialled in. A 2×2
MIMO link with orthogonal channels IS two independent AWGN links, and the rate
has doubled for free.

Say plainly that this is the promise of MIMO, and that everything after this
scene is the fine print.`,
  },
  {
    id: 'price',
    title: 'The price of forcing to zero',
    view: 'streams',
    params: { ...BASE, rho: 0.8, eq: 'zf' },
    visible: ['rho'],
    notes: `Go to the stream view and take ρ up from 0. The two clouds stay
CENTRED on the transmitted points — zero-forcing is unbiased, it removes the
interference exactly — and they inflate.

By how much is not a matter of taste. The channel is built so that
HᴴH = [[1, ρ], [ρ, 1]], hence [(HᴴH)⁻¹]ᵢᵢ = 1/(1−ρ²), and the noise on each
stream is multiplied by exactly that. In decibels the loss is −10·log10(1−ρ²),
which the statline prints and the room can compute: 0 dB at ρ = 0, 1.25 dB at
0.5, 4.4 dB at 0.8, 7.2 dB at 0.9.

Then switch to the SER tab. The blue ZF curve sits ON the orange dashed line,
which is the AWGN formula evaluated at γ·(1−ρ²). That is the sentence to leave
the room with: a linear MIMO receiver hands you back an AWGN channel — at a
worse signal-to-noise ratio, and by a factor you can write down.`,
  },
  {
    id: 'mmse',
    title: 'MMSE trades a little interference for less noise',
    view: 'streams',
    params: { ...BASE, rho: 0.8, eq: 'mmse', snr: 8 },
    visible: ['eq', 'snr'],
    notes: `Same channel, and switch the receiver from ZF to MMSE. The clouds
shrink. Nothing was done about the interference — some of it is still there, on
purpose — and the total error is smaller for it.

That is the whole idea: forcing the interference to exactly zero is a CHOICE,
and it is not the best one when the noise is large. MMSE minimises the mean
square error instead, which at low SNR means tolerating a little crosstalk to
avoid amplifying the noise. Take the SNR up to 20 and watch the two receivers
converge: (HᴴH + N₀I)⁻¹ → (HᴴH)⁻¹, so MMSE becomes ZF when the noise vanishes.

One implementation detail worth a sentence, because it bites: the MMSE estimate
is BIASED — minimising a mean square shrinks it toward the origin — and slicing
it as it stands scores worse than ZF on a 16-QAM. The receiver here divides the
bias out before deciding, as every textbook one does.`,
  },
  {
    id: 'ml',
    title: 'ML never leaves the received space',
    view: 'antennas',
    params: { ...BASE, rho: 0.9, snr: 10 },
    visible: ['rho', 'mod'],
    notes: `Back to the antennas, with ρ at 0.9 — a channel the linear receivers
find nearly unusable, 7.2 dB of loss.

Look at the black lattice rather than at the clouds. Two of the sixteen points
have come close together, because the two columns of H are nearly parallel; ML
confuses those two and nothing else. It never inverts anything, so it never
amplifies anything: it pays only where the geometry genuinely became ambiguous.

On the SER tab the green ML curve stays near the grey AWGN line while the blue
ZF one has fallen away by seven decibels. And the price of that is on the
statline of the drawer: ML searches M² hypotheses per symbol — 16 for a QPSK,
256 for a 16-QAM, and 4^n for n streams. Switch the modulation and say the
number out loud. THAT is why the linear receivers exist at all, and why
half the field is about getting close to ML without paying for it.`,
  },
];
