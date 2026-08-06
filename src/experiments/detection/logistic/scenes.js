// Lecture script. Auto-discovered by the registry.
//
// THE SCRIPT IS THE ROC, because that is what makes this a detection
// experiment rather than a statistics one. Every scene opens on it except the
// two that cannot: the third asks what the model CLAIMS about a probability,
// and the fourth is about the fit itself.
//
// Written to be played straight after "The Neyman–Pearson detector" and "When
// the signal is not known". Those two knew the densities, or knew them up to a
// parameter. This one knows nothing but examples.
const BASE = {
  d: 2.5,
  v: 1,
  N: 200,
  prior: 0.5,
  lam: 1e-12,
  thresh: 0.5,
  k: 25,
  seed: 34,
};

// PLAN — context 1 · problem 2 · method 3-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'bridge',
    title: 'The likelihood ratio, learned instead of derived',
    view: 'roc',
    params: { ...BASE },
    visible: ['N', 'd'],
    notes: `Two ROC curves, and start by asking the room what the orange one is.
It is the detector of the first experiment of this module: it knows μ₀, μ₁ and
Σ, it forms the likelihood ratio, and by Neyman–Pearson no test can be above it
at any P_FA. The blue one was given two hundred labelled points and nothing
else.

They very nearly coincide, and that is not a coincidence — it is an identity
worth writing on the board before touching a dial. With equal covariances,

    log Λ(x) = (μ₁−μ₀)ᵀΣ⁻¹x + const = wᵀx + b
    P(H₁|x)  = σ(log Λ(x) + log π₁/π₀) = σ(wᵀx + b)

so the model logistic regression POSTULATES is exactly the true posterior of
this problem. The method is not a new object: it is the Neyman–Pearson test in
which w and b are estimated rather than derived. The harness pins that identity
to 1e-16.

Now the one dial that matters here. Take N from 200 down to 25: the blue curve
falls away from the orange one, and the statline's two AUCs separate. Take N up
to 1000 and they close again — measured, the gap goes 0.0007 at N = 50 to
0.0001 at N = 1000. That gap is the price of not knowing the densities, and it
is paid in data.

Check the clairvoyant number in the room's head first: at v = 1 the AUC has a
closed form, Φ(d/√2). At d = 2.5 that is 0.9615, and the statline says 0.9596
on four thousand test points.

Then switch to "The two classes" to see the same thing as geometry: the yellow
Bayes boundary is a straight line, and the purple learned one lands on it.`,
  },
  {
    id: 'misspecified',
    title: 'v ≠ 1 — the gap that data does not close',
    view: 'roc',
    params: { ...BASE, v: 2.5 },
    visible: ['v', 'N'],
    notes: `THE scene. Freeze (F) at v = 1, then turn v up to 2.5.

What v does: class 1 is stretched by v along x₁ and squeezed by the same factor
along x₂, so det Σ₁ = 1 throughout. The class does not get bigger, it gets a
different SHAPE — and that is the only thing that changes.

The consequence is algebraic and the room should predict it before seeing it.
Once Σ₁ ≠ Σ₀ the quadratic terms of the two exponents no longer cancel, so

    log Λ(x) = −½ xᵀ(Σ₁⁻¹ − Σ₀⁻¹)x + …

is QUADRATIC in x. The true boundary is a conic; the logistic model can only
ever draw a line. Switch to "The two classes" and there it is — the yellow
boundary bends into a hyperbola and the purple line cuts across it.

Now the question that makes the scene, and ask it before moving anything:
"more data will fix this, won't it?" Take N to 1000. It does not. Measured, the
AUC gap is 0.0128 at N = 50, 0.0135 at N = 200 and 0.0128 at N = 1000 — flat.
Put that next to the previous scene, where the same sweep took the gap from
0.0007 to 0.0001.

That contrast is the whole lesson, and it is the difference between two kinds
of error. VARIANCE goes away with data. MISSPECIFICATION does not: no amount of
examples teaches a straight line to be a hyperbola. The statline names which
regime you are in.

If there is time, the fix is worth a sentence: keep the two covariances
separate and you get quadratic discriminant analysis, which is this same
picture with a conic boundary and more parameters to estimate. The catalogue's
usual invoice applies — a richer model buys bias and sells variance.`,
  },
  {
    id: 'threshold',
    title: 'The threshold IS the prior',
    view: 'posterior',
    params: { ...BASE, prior: 0.2, N: 600 },
    visible: ['thresh', 'prior'],
    notes: `A different reading of the same fit: the horizontal axis is the
score wᵀx + b, the curve is what the model claims the probability of class 1 is
at that score, and the grey rug at 0 and 1 is where the test points actually
sit.

The orange dots are the measurement. The four thousand test points are cut into
fourteen equal-count bins along the score, and each dot is the observed
fraction of class 1 in its bin. The model says that fraction should be σ(t).
Here, at v = 1, the dots sit ON the curve — the model is CALIBRATED, and its
output is a probability rather than a score. Say that plainly: this is the
property that makes the number usable in a decision, and most classifiers do
not have it.

Then move τ and watch the yellow vertical slide. Two things to make explicit:

— τ is the same object as the γ of Neyman–Pearson. On the posterior it is a
probability; on the score it is a log-odds threshold, and the drawer prints the
conversion. Sliding τ walks the operating point along the blue ROC, which the
first tab shows live.

— π₁ = 0.2 here, and the fit knows it: the intercept has absorbed
log(π₁/π₀) = −1.39 all by itself, from the labels. Take π₁ to 0.5 and back and
watch the whole sigmoid translate along the axis while its SHAPE does not
change. The prior moves the threshold, never the direction — which is why the
ROC does not move at all when π₁ does.

Last, turn v to 2.5 and come back here. The dots leave the curve. The
misspecification of the previous scene, read on a probability instead of on a
boundary: the model is now not merely suboptimal, it is LYING about its own
confidence.`,
  },
  {
    id: 'separable',
    title: 'When the maximum likelihood does not exist',
    view: 'irls',
    params: { ...BASE, d: 8, N: 30, lam: 1e-12, k: 25 },
    visible: ['k', 'lam', 'N'],
    notes: `Thirty points, and the two classes do not overlap at all. Every
teacher's instinct says this is the easy case. It is the one that breaks.

Slide k, the Newton iteration, from 1 to 60 and watch the two panels. The cost
falls to 3.7e-5, then 1.8e-9, then 6e-12 — it is heading for zero. And ‖w‖ does
not settle: 1.7 at iteration 5, 3.9 at 10, 9.3 at 20, 13.1 at 30.

Ask the room what the maximum-likelihood estimate is. There isn't one. If a
line separates the data, then doubling w doubles every margin, pushes every
σ(wᵀx+b) closer to 0 or 1, and STRICTLY reduces the cost — for any w you
propose, 2w is better. The likelihood has a supremum it never attains, and the
optimum lies at infinity. This is not a bug in the algorithm, and no better
optimizer repairs it.

Two honest details worth saying out loud. The curves flatten around iteration
30 at ‖w‖ = 13.1; that is double precision running out, not mathematics — the
margins are large enough that σ returns exactly 1. And the statline says
"training set separated", which is the condition, and it is a property of the
DATA, not of the method.

Now the cure, and it is one pill. Take λ from 1e-12 up to 1. The lower panel
stops climbing and lands flat: with a penalty λ‖w‖² the objective is strictly
convex and coercive, so a finite minimum exists and Newton finds it — the
harness pins it as converging to the last digit. That is the real argument for
regularization here, and it is not the one usually given: not "it generalizes
better", but "without it the estimate does not exist".

Then take N from 30 up to 300 with λ back at 1e-12. The classes start to
overlap, separability is lost, the statline changes its verdict, and ‖w‖
settles on its own. Separability is a small-sample accident — which is exactly
when a room is most tempted to trust a perfect training score.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
