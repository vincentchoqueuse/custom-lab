// Lecture script. Auto-discovered by the registry.
//
// Written to be played straight after "The Neyman–Pearson detector": same σ,
// same convention for the SNR, same three tabs in the same order. What changes
// is what the receiver is allowed to know.
const BASE = { snr: 0.1, N: 20, pfa: 0.01, detector: 'glrt', R: 16, M: 4000, seed: 34 };

export default [
  {
    id: 'amplitude',
    title: 'Not knowing the amplitude',
    view: 'densities',
    params: { ...BASE, detector: 'matched' },
    visible: ['detector', 'snr'],
    notes: `Start on the matched filter, which is the previous experiment: two
Gaussians, a threshold, and the two shaded tails. Nothing new.

Now switch the detector to GLRT and watch the figure change SHAPE. The
likelihood ratio no longer exists — there is no single H₁, there is a family of
them indexed by A — so the test maximises the likelihood over A and compares
that. On a Gaussian problem the maximum is at Â = Σxs, and the statistic
becomes its SQUARE. Squaring a standard Gaussian gives a χ² with one degree of
freedom: the two densities are now piled against zero with long right tails,
and the threshold has moved from 2.33 to 6.63.

Why square it at all? Because the amplitude's SIGN is unknown too. A matched
filter that fires on a large positive correlation would miss a signal that
arrived inverted; the GLRT fires on a large correlation of either sign, and
that symmetry is what it pays for.

The statline gives the bill: about 1.6 dB at this operating point. Worth asking
before showing it — "how much do you think one unknown number costs?" The room
usually guesses far more.`,
  },
  {
    id: 'signal',
    title: 'Not knowing the signal at all',
    view: 'pd-vs-snr',
    params: { ...BASE, detector: 'energy' },
    visible: ['detector', 'N'],
    notes: `The four curves at one P_FA, and this is the tab the experiment
exists for.

The point is NOT the ordering, which is unsurprising. It is that the green
curve — the energy detector — is not the blue one shifted. It is a different
SHAPE. The matched filter's deflection grows as √N·SNR; the energy detector's
as SNR²·√(N/2). Per decibel of SNR that is a factor of two in the exponent, so
the gap between them GROWS as the SNR falls, and no fixed number of decibels
describes it.

The consequence is the one every radio-astronomer and every spectrum-sensing
paper starts from: to reach a given P_D, a matched filter needs N proportional
to 1/SNR, a radiometer needs N proportional to 1/SNR². At −20 dB that is the
difference between a hundred samples and ten thousand.

Take N from 20 to 200 and watch every curve slide left. Then take the SNR down
and watch the green one fall away from the blue one faster than the eye
expects. The harness measures the two exponents and pins them at 1 and 2.

Worth ending on what the energy detector buys for that price: it works on a
signal nobody has described. That is not a small thing — it is how you find a
transmitter you have never heard.`,
  },
  {
    id: 'cfar',
    title: 'Not knowing the noise either',
    view: 'densities',
    params: { ...BASE, detector: 'cfar', R: 4 },
    visible: ['R', 'detector'],
    notes: `The last unknown, and it breaks the figure in a different way.

Every threshold so far was a number computed from σ. Take σ away and the
threshold cannot be computed — and a threshold that is wrong by a factor of two
does not cost a little precision, it costs ORDERS of magnitude on P_FA. That is
the failure a radar cannot have: a constant false-alarm rate is the whole
specification.

The answer is to estimate σ² from M reference cells beside the one under test
and to threshold the RATIO. The purple band is where that estimated threshold
actually lands, from the 5th to the 95th percentile — at R = 4 it is a wide
band, and the room should see that the threshold is now a random variable.

The property that makes it worth doing: P_FA does not depend on σ at all. The
ratio is F(N, MN) distributed whatever the noise power, which is what "constant
false alarm rate" means, and the harness checks it by moving σ over two decades
and finding the same P̂_FA.

Now take R from 4 to 64. The band narrows, and the statline's loss falls toward
the energy detector's. The drawer gives the closed form the loss comes from:
the multiplier R(P_FA^(−1/R) − 1) tends to −ln P_FA, which is exactly the
known-σ threshold. Estimating the noise costs decibels; estimating it from
enough cells costs nothing.`,
  },
  {
    id: 'roc',
    title: 'The four of them on one ROC',
    view: 'roc',
    params: { ...BASE, detector: 'energy', snr: 0.25 },
    visible: ['detector', 'pfa'],
    notes: `The same comparison in the coordinates a detection engineer
actually works in: P_D against P_FA, both logarithmic, at a fixed SNR.

The orange dashed curve is the matched filter and it is a ceiling — no test
that knows less can be above it, which is the Neyman–Pearson lemma and not an
observation about these curves. The blue one is the detector on the pill, and
the gap between them is the price of what it does not know.

Walk the detector pill down the list and watch the blue curve fall away from
the ceiling: matched (on it), GLRT (just under), energy (well under), CFAR
(under that). Then move P_FA and follow the yellow operating point along the
curve, with the green Monte Carlo dot beside it — the dot comes from the full
N-sample simulation and not from the statistic's law, so its agreement with the
curve is a check of the theory rather than of the arithmetic.

The question that closes the chapter: at P_FA = 10⁻⁴, which of these would you
put in a radar? The answer is none of them alone — it is the matched filter for
the pulse you transmitted, with a CFAR threshold on top, because you know your
own pulse and you do not know the clutter.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
