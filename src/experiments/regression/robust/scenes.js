// Lecture script. Auto-discovered by the registry.
const BASE = {
  a: 1.5,
  b: 1,
  sigma: 0.7,
  N: 40,
  spread: 3,
  contam: 0.05,
  shift: 12,
  pattern: 'scatter',
  method: 'huber',
  delta: 1.5,
  thr: 1.5,
  seed: 34,
};

export default [
  {
    id: 'one-point',
    title: 'Two points out of forty',
    view: 'fit',
    params: { ...BASE, contam: 0.05, shift: 12 },
    visible: ['shift', 'contam'],
    notes: `Forty points on a line, two of them pushed up by twelve. Not a
mistake in the model — a sensor that saturated, a frame that arrived twice, a
comma in the wrong place. Every real dataset has some.

The blue line is least squares and it is visibly wrong; the green one is Huber
and it is where the points are. Both saw exactly the same forty points.

Drag the offset and narrate it, because the blue line does something very
particular: it follows, PROPORTIONALLY. Double the offset and it moves twice as
far. The statline gives the exact coefficient — Σ(xᵢ−x̄)/Sxx over the
contaminated points — and the harness pins it to machine precision. This is not
"least squares is fragile", it is an equality: â is linear in every yᵢ, so a
point can move it as far as you like, and nothing in the method can notice.

Then take the offset to zero. The two lines fall on top of each other. That is
the other half of the deal and it has to be shown: on clean data the robust fit
costs almost nothing.`,
  },
  {
    id: 'why',
    title: 'The square is the problem',
    view: 'loss',
    params: { ...BASE, contam: 0.05, shift: 12, delta: 1.5 },
    visible: ['delta', 'method'],
    notes: `One tab, and it explains everything else.

Blue is r²/2. It has no bound: a residual ten times larger costs a hundred
times more, so a single point can outvote the other thirty-nine. Least squares
does not "fail" on an outlier — it does precisely what it was asked to do.

Orange is |r|. Straight, so a residual ten times larger costs ten times more,
and no point can ever dominate by being far. That is L1, and its price is that
it is less efficient than least squares on clean Gaussian data — about 64 % of
the information.

Green is Huber: the blue curve near zero, the orange one beyond δ. Efficiency
where the noise lives, resistance where it does not. Moving δ shows both limits
and the harness pins them both — at large δ Huber IS least squares, to 1e-12;
at small δ it becomes L1.

Purple is RANSAC and it is not a curve at all: zero inside the band, one
outside. A point past the band contributes NOTHING, not even a bounded amount.
That is what buys the next scene.`,
  },
  {
    id: 'breakdown',
    title: 'How much contamination each one survives',
    view: 'breakdown',
    params: { ...BASE, contam: 0.05, shift: 12, method: 'huber' },
    visible: ['contam', 'method', 'pattern'],
    notes: `The same sample, with the offset swept from −20 to +20, and how far
each fitted LINE ends up from the true one — the worst gap over the design, not
the error on the slope alone. The distinction matters here and the figure would
lie without it: outliers pushed together sit on a line PARALLEL to the truth, so
a slope reading would call that fit perfect while it has moved bodily off the
data.

Least squares is a clean V — the closed form of scene 1, drawn, folded at the
offset where it happens to be right. Huber is FLAT over the middle and then
lifts: while the contaminated points stay inside δ they are ordinary points;
once they leave, their cost grows only linearly and they can still pull the
line, just slowly.

Now raise ε and watch where each one gives. At 5 % Huber holds. At 25 % it is
visibly pulled. Somewhere below 50 % it goes over.

Switch the method to RANSAC and sweep again: flat, and it stays flat. Then push
ε past 0.5 and it is STILL flat, which is not what the textbook number leads one
to expect — and this is the scene's real content.

The breakdown point of 1/2 is a statement about outliers that AGREE. RANSAC
keeps the largest set of points that fit one line within the band; twenty-two
contaminated points scattered over eighteen units of y are not a set, they are
twenty-two sets of one. The eighteen clean points still win, and the harness
measures it: at ε = 0.55, scattered, the fit is 0.04 off the true line.

Now flip the structure pill to "all pushed together". Same number of
contaminated points, same offset — but now they lie on a line parallel to the
true one, and they are the majority. RANSAC returns THEIR line, bodily shifted,
and the cliff appears exactly where the textbook says. Same ε, same Δy, one
difference: whether the bad points agree with each other.

That is the sentence to leave: a breakdown point is not "how many outliers a
method survives", it is "how many ORGANISED outliers". And RANSAC's resistance
is in any case bought with a band that has to be chosen, and choosing it needs
to know the noise. Nothing here is free.`,
  },
  {
    id: 'price',
    title: 'What robustness costs on clean data',
    view: 'fit',
    params: { ...BASE, contam: 0, shift: 0, sigma: 1.2, method: 'l1' },
    visible: ['method', 'sigma'],
    notes: `No contamination at all, and this is the scene that keeps the
lecture honest.

Press R a dozen times with method = L1 and watch the two lines. They stay
close, but the green one is a little livelier: on clean Gaussian data L1 has
about 64 % of the efficiency of least squares, which means it needs half again
as many points for the same precision. That is the insurance premium.

Switch to Huber: the green line calms down and follows the blue one almost
exactly. With δ around 1.5σ, Huber keeps roughly 95 % of the efficiency and
still resists — which is why it is the default in every library that has one.

The question to leave with the room: if robustness costs 5 % on clean data and
saves everything on contaminated data, what is the argument for least squares?
The honest answer is the closed form. Least squares has one, in one line, with
a distribution attached; the others need an iteration and a bootstrap. That is
worth something, and it is worth less than it used to be.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
