// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'threshold',
    title: 'The threshold trade-off',
    params: { snr: 1, pfa: 0.05, N: 10 },
    visible: ['pfa', 'snr'],
    notes: `Two Gaussians: the statistic T under H₀ in blue and under H₁ in
orange. The threshold γ cuts out P_FA, the blue area to its right, and P_D, the
orange one.

Lowering P_FA on the logarithmic slider pushes γ to the right and collapses P_D
with it, which is the whole of Neyman–Pearson in one gesture: the two cannot be
chosen independently, so P_FA is fixed and P_D is maximized. Raising the SNR
separates the two humps and softens the dilemma — that is the only thing that
does.`,
  },
  {
    id: 'roc',
    title: 'The ROC curve',
    params: { snr: 1, pfa: 0.05, N: 10, M: 10000 },
    view: 'roc',
    visible: ['snr', 'N'],
    notes: `Each value of γ is one point, and the ROC is the locus of all of
them. Moving P_FA slides the yellow point along the curve without changing the
detector at all; raising the SNR or N bulges the curve toward the ideal corner
at (0, 1), which is a different statement entirely.

The dashed diagonal is the coin-flip detector. The P_FA axis is logarithmic
because the rare-false-alarm regime is where detection actually lives, and a
linear axis crushes it against the origin.`,
  },
  {
    id: 'integration',
    title: 'Integrating helps: P_D vs SNR',
    params: { snr: 0.5, pfa: 0.01, N: 10 },
    view: 'pd-vs-snr',
    visible: ['N', 'pfa'],
    notes: `At a fixed P_FA the curve P_D(SNR) is a softened step. Doubling N
shifts it 3 dB to the left, since d² = N·SNR: integrating for twice as long is
worth twice the transmitted power, and that equivalence is the design decision
behind every long observation.

The grey floor is P_D → P_FA at very low SNR, where the detector is guessing.
The steepness is worth remarking on — everything happens within about 10 dB,
below which the system is blind and above which the problem is solved.`,
  },
  {
    id: 'rare',
    title: 'Rare false alarms (P_FA = 10⁻³)',
    params: { snr: 2, pfa: 1e-3, N: 10, M: 20000 },
    view: 'roc',
    visible: ['pfa', 'M'],
    notes: `With P_FA = 10⁻³ and twenty thousand draws, only about twenty false
alarms are expected. Pressing R makes the purple Monte Carlo point dance along
the horizontal axis, which is the cost of estimating a rare event: the relative
variance goes as 1/√(M·P_FA).

Going down to 10⁻⁴ can make the point disappear altogether, when no false alarm
is measured at all and zero has no place on a logarithmic axis. This is the
concrete reason the slider is logarithmic.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
